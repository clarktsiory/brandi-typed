import {
  DependencyModule,
  injected,
  RequiredToken,
  Token,
  TokenValue,
} from 'brandi'
import { ScopeSyntax } from 'brandi/lib/typings/container/syntax/ScopeSyntax'
import { TypeSyntax } from 'brandi/lib/typings/container/syntax/TypeSyntax'
import {
  UnknownCreator,
  UnknownCreatorParameters,
} from 'brandi/lib/typings/types'
import { identity, pipe, tuple } from 'fp-ts/function'
import * as R from 'fp-ts/Reader'

/**
 * Type utils
 */
type FilterFlags<Base, Condition> = {
  [Key in keyof Base]: Base[Key] extends Condition ? Key : never
}

type ExtractCond<Base, Condition> = Pick<
  Base,
  FilterFlags<Base, Condition>[keyof Base]
>

export interface DependencyModuleWithTokens<
  TOKENS extends Record<string, Token>
> extends DependencyModule {
  readonly tokens: TOKENS
  readonly allTokens: Token[]
}

type Bindings<out TOKENS> = {
  [K in keyof TOKENS]: TOKENS[K] extends Token<infer V>
    ? (
        arg: TypeSyntax<V>
      ) => ScopeSyntax | [ScopeSyntax, keyof typeof Scope] | void
    : never
}

type Module<TOKENS extends Record<string, Token>> =
  DependencyModuleWithTokens<TOKENS>

class DependencyModuleWithTokensImpl<
  TOKENS extends Record<string, Token>
> extends DependencyModule {
  readonly allTokens: Token[]
  constructor(readonly tokens: TOKENS) {
    super()
    this.allTokens = Object.values(tokens)
  }
}

const bind: <TOKENS extends Record<string, Token>>(
  tokens: TOKENS
) => (bindings: Bindings<TOKENS>) => Module<TOKENS> =
  (tokens) => (bindings) => {
    const mod = new DependencyModuleWithTokensImpl(tokens)
    Object.entries(bindings)
      .filter(([k]) => Object.hasOwn(tokens, k)) //safely use bindings that are mapped to tokens
      .map(([k, v]) =>
        tuple(
          k as keyof typeof tokens,
          v as typeof bindings[keyof typeof bindings]
        )
      )
      .forEach(([k, v]) => applyScope(v(mod.bind(tokens[k]))))
    return mod
  }

const allBindings: <TOKENS extends Record<string, Token>>(
  tokens: TOKENS
) => R.Reader<Bindings<TOKENS>, Module<TOKENS>> = (tokens) =>
  pipe(
    R.ask<DependencyModuleWithTokens<typeof tokens>>(),
    R.local(bind(tokens))
  )

enum Scope {
  CONTAINER = 'CONTAINER',
  RESOLUTION = 'RESOLUTION',
  TRANSIENT = 'TRANSIENT',
  SINGLETON = 'SINGLETON',
}

const applyScope = (
  syntax: ScopeSyntax | [ScopeSyntax, keyof typeof Scope] | void,
  defaultScope: Scope = Scope.CONTAINER
) => {
  if (!syntax) return
  const [scopeSyntax, scope] = Array.isArray(syntax)
    ? syntax
    : ([syntax, defaultScope] as const)
  switch (scope) {
    case Scope.CONTAINER:
      scopeSyntax.inContainerScope()
      break
    case Scope.RESOLUTION:
      scopeSyntax.inResolutionScope()
      break
    case Scope.TRANSIENT:
      scopeSyntax.inTransientScope()
      break
    case Scope.SINGLETON:
      scopeSyntax.inSingletonScope()
      break
  }
}

const makeInjector = <TOKENS extends Record<string, Token>>(
  registry: Map<UnknownCreator, R.Reader<Module<TOKENS>, TokenValue[]>>
) => {
  type AllowedTokens = TOKENS
  type AllowedTokensKeys = keyof AllowedTokens

  type ToAllowedKeys<T extends unknown[]> = {
    [K in keyof T]-?: ExtractCond<AllowedTokens, Token<T[K]>> extends Record<
      infer I,
      TokenValue
    >
      ? I
      : never
  }

  /**
   * Keys that are used to access a token in resulting DependencyModuleWithTokens
   */
  type InjectedKeys<T extends UnknownCreator> = ToAllowedKeys<
    UnknownCreatorParameters<T>
  > extends AllowedTokensKeys[]
    ? ToAllowedKeys<UnknownCreatorParameters<T>>
    : never

  return <T extends UnknownCreator>(
    target: T,
    ...tokensKeys: InjectedKeys<T>
  ) => {
    registry.set(target, (mod) => tokensKeys.map((k) => mod.tokens[k]))
    return target
  }
}

type Injector<TOKENS extends Record<string, Token>> = ReturnType<
  typeof makeInjector<TOKENS>
>

class ContravariantMaker<
  TOKENS extends Record<string, Token>,
  in BINDINGTOKENS extends keyof TOKENS
> {
  private maker: R.Reader<Bindings<TOKENS>, Module<TOKENS>>
  constructor(
    make: R.Reader<Bindings<Pick<TOKENS, BINDINGTOKENS>>, Module<TOKENS>>
  ) {
    this.maker = pipe(make, R.local(identity))
  }

  make(bindings: Bindings<Pick<TOKENS, BINDINGTOKENS>>): Module<TOKENS> {
    return this.maker(bindings as Bindings<TOKENS>) // force call, even if bindings are not exhaustive (assumes "make" was built using previous bindings)
  }
}

// Combine :
// - null intersection : DIModule<T1 & T2, B1 | B2>
// - some intersection : DIModule<T1 & T2, (B1 | B2) \ (B1 & B2)>
// - inclusion : DIModule<T1 & T2, lower(B1 | B2)> (meet semilattice : x <= y when x ^ y = x, greatest lower bound (meet) is with B = never)
// THIS CRAZY TYPE MAKES IT COMMUTATIVE AND IDEMPOTENT !
type MeetBindings<M1, M2> = M1 extends DIModule<infer T1, infer B1>
  ? M2 extends DIModule<infer T2, infer B2>
    ? B2 extends keyof T1
      ? T1 extends T2
        ? Exclude<B1, keyof T2> | B2 // inclusion
        : T2 extends T1
        ? Exclude<B2, keyof T1> | B1 // inclusion
        : Exclude<B1 | B2, B1 & B2> // some
      : B1 | B2 // null
    : never
  : never

export class DIModule<
  TOKENS extends Record<string, Token>,
  in BINDINGTOKENS extends keyof TOKENS
> extends ContravariantMaker<TOKENS, BINDINGTOKENS> {
  constructor(
    readonly injector: Injector<TOKENS>,
    make: R.Reader<Bindings<Pick<TOKENS, BINDINGTOKENS>>, Module<TOKENS>>
  ) {
    super(make)
  }

  bind<Bound extends BINDINGTOKENS>(
    key: Bound,
    binding: Bindings<TOKENS>[Bound]
  ): DIModule<TOKENS, Exclude<BINDINGTOKENS, Bound>> {
    return new DIModule<TOKENS, Exclude<BINDINGTOKENS, Bound>>(
      this.injector,
      pipe(
        (i: Bindings<Pick<TOKENS, BINDINGTOKENS>>) => this.make(i),
        R.compose(
          (remainder) =>
            ({
              [key]: binding,
              ...remainder,
            } as unknown as Bindings<TOKENS>)
        )
      )
    )
  }

  combine<
    TOKENS2 extends Record<string, Token>,
    BINDINGTOKENS2 extends keyof TOKENS2
  >(
    mod2: DIModule<TOKENS2, BINDINGTOKENS2>
  ): DIModule<
    TOKENS & TOKENS2,
    MeetBindings<
      DIModule<TOKENS, BINDINGTOKENS>,
      DIModule<TOKENS2, BINDINGTOKENS2>
    >
  > {
    //TODO: injector may be reused as (callable) class
    const localRegistry = new Map<
      UnknownCreator,
      R.Reader<Module<TOKENS & TOKENS2>, TokenValue[]>
    >()

    const injector = makeInjector(localRegistry)

    const applyInjector = (mod: Module<TOKENS & TOKENS2>) => {
      [...localRegistry.entries()].forEach(([k, v]) => {
        injected(k, ...(v(mod) as RequiredToken<never>[]))
      })
      return mod
    }

    return new DIModule(
      injector,
      pipe(
        R.Do,
        R.bind('firstMod', () =>
          R.asks((bindings: Bindings<Pick<TOKENS, BINDINGTOKENS>>) =>
            this.make(bindings)
          )
        ), // mod1 receives both PARTIALTOKENS1 and PARTIALTOKENS2, handling potentially unknown tokens is delegated to mod1
        R.bindW('secondMod', () =>
          R.asks((bindings: Bindings<Pick<TOKENS2, BINDINGTOKENS2>>) =>
            mod2.make(bindings)
          )
        ),
        R.bind('bindings', () => R.ask()),
        R.map(({ firstMod, secondMod, bindings }) => {
          const tokens = {
            ...firstMod.tokens,
            ...secondMod.tokens,
          }

          // compute difference
          const unboundTokens = Object.fromEntries(
            [...Object.entries(tokens)].filter(([k]) =>
              Object.hasOwn(bindings, k)
            )
          )
          const thirdMod = bind(unboundTokens)(bindings)

          // complete dep module with all tokens. Bindings are used from existing modules.
          const mod = new DependencyModuleWithTokensImpl(tokens)
          firstMod.allTokens.forEach((tok) => mod.use(tok).from(firstMod))
          secondMod.allTokens.forEach((tok) => mod.use(tok).from(secondMod))
          thirdMod.allTokens.forEach((tok) => mod.use(tok).from(thirdMod))
          applyInjector(mod)
          return mod
        })
      )
    )
  }
}

export const makeInjectedModule = <TOKENS extends Record<string, Token>>(
  tokens: TOKENS
): DIModule<TOKENS, keyof TOKENS> => {
  const localRegistry = new Map<
    UnknownCreator,
    R.Reader<Module<TOKENS>, TokenValue[]>
  >()

  const injector = makeInjector(localRegistry)

  const applyInjector = pipe(
    allBindings(tokens),
    R.map((mod) => {
      [...localRegistry.entries()].forEach(([k, v]) => {
        injected(k, ...(v(mod) as RequiredToken<never>[]))
      })
      return mod
    })
  )

  return new DIModule<TOKENS, keyof TOKENS>(injector, applyInjector)
}

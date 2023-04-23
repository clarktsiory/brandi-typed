import { createContainer, token } from 'brandi'
import { makeInjectedModule } from '../src/brandi'

describe('Brandi extended library', () => {
  describe('Make module', () => {
    interface Component1 {
      readonly value: number
    }
    interface Component2 {
      add(n: number): number
    }

    const tokens = {
      tok1: token<Component1>('Component1'),
      tok2: token<Component2>('Component2'),
    }

    it('should create dependency module with all bindings in container scope', () => {
      class AddOne implements Component2 {
        constructor() {
          AddOne.instances.push(this)
        }
        add(n: number): number {
          return n + 1
        }

        static instances: AddOne[] = []
      }

      const mod = makeInjectedModule(tokens).make({
        tok1: (i) => i.toInstance(() => ({ value: 1 })),
        tok2: (i) => i.toInstance(AddOne),
      })

      expect(mod.tokens).toStrictEqual(tokens)
      expect(mod.allTokens).toStrictEqual(Object.values(tokens))

      const container = createContainer()
      container.use(mod.tokens.tok2).from(mod)
      const c2instance = container.get(mod.tokens.tok2)
      expect(AddOne.instances).toStrictEqual([c2instance])
      expect(c2instance.add(2)).toStrictEqual(3)

      container.use(mod.tokens.tok1).from(mod)
      expect(container.get(mod.tokens.tok1).value).toStrictEqual(1)

      //TODO: test scopes: singleton, etc.
    })

    it('should create injector with dependency module with all bindings and injections', () => {
      const module = makeInjectedModule(tokens).bind('tok1', (i) =>
        i.toInstance(() => ({ value: 2 }))
      )

      class AddValue implements Component2 {
        constructor(private readonly c1: Component1) {
          AddValue.instances.push(this)
        }
        add(n: number): number {
          return this.c1.value + n
        }
        static instances: AddValue[] = []
      }

      module.injector(AddValue, 'tok1')

      const mod = module.make({
        tok2: (i) => i.toInstance(AddValue),
      })

      expect(mod.tokens).toStrictEqual(tokens)
      expect(mod.allTokens).toStrictEqual(Object.values(tokens))

      const container = createContainer()
      container.use(mod.tokens.tok2).from(mod)
      const c2instance = container.get(mod.tokens.tok2)
      expect(AddValue.instances).toStrictEqual([c2instance])
      expect(c2instance.add(2)).toStrictEqual(4)

      container.use(mod.tokens.tok1).from(mod)
      expect(container.get(mod.tokens.tok1).value).toStrictEqual(2)
    })

    it('should raise injection error when injector was not called', () => {
      class AddValueNoInject implements Component2 {
        constructor(private readonly c1: Component1) {
          AddValueNoInject.instances.push(this)
        }
        add(n: number): number {
          return this.c1.value + n
        }
        static instances: AddValueNoInject[] = []
      }
      const module = makeInjectedModule(tokens)
        .bind('tok1', (i) => i.toInstance(() => ({ value: 2 })))
        .bind('tok2', (i) => i.toInstance(AddValueNoInject))

      const mod = module.make({})

      expect(mod.tokens).toStrictEqual(tokens)
      expect(mod.allTokens).toStrictEqual(Object.values(tokens))

      const container = createContainer()
      container.use(mod.tokens.tok2).from(mod)
      expect(() => {
        container.get(mod.tokens.tok2)
      }).toThrowError(
        /Missing required 'injected' registration of 'AddValueNoInject'/
      )
      expect(AddValueNoInject.instances).toHaveLength(0)
    })
  })

  describe('Combine modules', () => {
    const tokens1 = {
      tok11: token<string>('some string'),
    }
    const tokens2 = {
      tok21: token<number>('some number'),
    }
    it('should combine tokens when all are initialized', () => {
      const makeMod1 = makeInjectedModule(tokens1).bind('tok11', (i) =>
        i.toInstance(() => 'a')
      )
      const makeMod2 = makeInjectedModule(tokens2).bind('tok21', (i) =>
        i.toInstance(() => 1)
      )
      const combined = makeMod1.combine(makeMod2)
      const mod = combined.make({})

      expect(mod.tokens.tok11).toStrictEqual(tokens1.tok11)
      expect(mod.tokens.tok21).toStrictEqual(tokens2.tok21)
      expect(mod.allTokens).toStrictEqual([tokens1.tok11, tokens2.tok21])

      const container = createContainer()
      container.use(tokens1.tok11).from(mod)
      container.use(tokens2.tok21).from(mod)
      expect(container.get(tokens1.tok11)).toStrictEqual('a')
      expect(container.get(tokens2.tok21)).toStrictEqual(1)
    })

    it('should combine tokens when some are passed after combination', () => {
      const makeMod1 = makeInjectedModule(tokens1).bind('tok11', (i) =>
        i.toInstance(() => 'a')
      )
      const makeMod2 = makeInjectedModule(tokens2)
      const combined = makeMod1.combine(makeMod2)
      const mod = combined.make({ tok21: (i) => i.toInstance(() => 1) })

      expect(mod.tokens.tok11).toStrictEqual(tokens1.tok11)
      expect(mod.tokens.tok21).toStrictEqual(tokens2.tok21)
      expect(mod.allTokens).toStrictEqual([tokens1.tok11, tokens2.tok21])

      const container = createContainer()
      container.use(tokens1.tok11).from(mod)
      container.use(tokens2.tok21).from(mod)
      expect(container.get(tokens1.tok11)).toStrictEqual('a')
      expect(container.get(tokens2.tok21)).toStrictEqual(1)
    })
  })
})

export { }


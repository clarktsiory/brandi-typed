import { token } from 'brandi'
import { expectType } from 'tsd'
import { DIModule, makeInjectedModule } from '../src/brandi'

const tokens = {
  tok1: token<string>('some string'),
  tok2: token<string>('some other string'),
}

expectType<DIModule<typeof tokens, 'tok1' | 'tok2'>>(makeInjectedModule(tokens))

// Raw
expectType<DIModule<typeof tokens, 'tok1' | 'tok2'>>(
  makeInjectedModule(tokens).combine(makeInjectedModule(tokens))
)

// With bindings (absorption)
expectType<DIModule<typeof tokens, 'tok2'>>(
  makeInjectedModule(tokens).combine(
    makeInjectedModule(tokens).bind('tok1', (i) => i.toConstant('1'))
  )
)
expectType<DIModule<typeof tokens, 'tok1' | 'tok2'>>(
  makeInjectedModule(tokens)
    .bind('tok1', (i) => i.toConstant('1'))
    .combine(makeInjectedModule(tokens))
) // <- this "widens" the first one to the second one, making it 'tok1' | 'tok2'

// With null bindings (absorption)
expectType<DIModule<typeof tokens, never>>(
  makeInjectedModule(tokens).combine(
    makeInjectedModule(tokens)
      .bind('tok1', (i) => i.toConstant('1'))
      .bind('tok2', (i) => i.toConstant('2'))
  )
)
expectType<DIModule<typeof tokens, 'tok1' | 'tok2'>>(
  makeInjectedModule(tokens)
    .bind('tok1', (i) => i.toConstant('1'))
    .bind('tok2', (i) => i.toConstant('2'))
    .combine(makeInjectedModule(tokens))
) // <- this "widens" the first one to the second one, making it 'tok1' | 'tok2'

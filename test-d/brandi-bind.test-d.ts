import { token } from 'brandi'
import { expectType } from 'tsd'
import { DIModule, makeInjectedModule } from '../src/brandi'

const tokens = {
  tok1: token<string>('some string'),
  tok2: token<number>('some number'),
}

expectType<DIModule<typeof tokens, 'tok1' | 'tok2'>>(makeInjectedModule(tokens))
expectType<DIModule<typeof tokens, 'tok2'>>(
  makeInjectedModule(tokens).bind('tok1', (i) => i.toConstant('1'))
)
expectType<DIModule<typeof tokens, never>>(
  makeInjectedModule(tokens)
    .bind('tok1', (i) => i.toConstant('1'))
    .bind('tok2', (i) => i.toConstant(2))
)

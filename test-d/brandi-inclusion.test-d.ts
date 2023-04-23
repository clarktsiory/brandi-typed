import { token } from 'brandi'
import { expectType } from 'tsd'
import { DIModule, makeInjectedModule } from '../src/brandi'

const tokens1I = {
  tok12: token<string>('some other string'),
}
const tokens2I = {
  tok21: token<number>('some number'),
  tok12: tokens1I.tok12,
}

expectType<DIModule<typeof tokens1I, 'tok12'>>(makeInjectedModule(tokens1I))
expectType<DIModule<typeof tokens2I, 'tok21' | 'tok12'>>(
  makeInjectedModule(tokens2I)
)

// Combined
expectType<DIModule<typeof tokens1I & typeof tokens2I, 'tok21' | 'tok12'>>(
  makeInjectedModule(tokens1I).combine(makeInjectedModule(tokens2I))
)

// Commutativity
expectType<DIModule<typeof tokens1I & typeof tokens2I, 'tok21' | 'tok12'>>(
  makeInjectedModule(tokens1I).combine(makeInjectedModule(tokens2I))
)
expectType<DIModule<typeof tokens2I & typeof tokens1I, 'tok21' | 'tok12'>>(
  makeInjectedModule(tokens2I).combine(makeInjectedModule(tokens1I))
)

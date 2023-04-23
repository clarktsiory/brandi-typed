import { token } from 'brandi'
import { expectType } from 'tsd'
import { DIModule, makeInjectedModule } from '../src/brandi'

const tokens1S = {
  tok11: token<string>('some string'),
  tok12: token<string>('some other string'),
}
const tokens2S = {
  tok21: token<number>('some number'),
  tok12: token<number>('some other number'),
}

expectType<DIModule<typeof tokens1S, 'tok11' | 'tok12'>>(
  makeInjectedModule(tokens1S)
)
expectType<DIModule<typeof tokens2S, 'tok21' | 'tok12'>>(
  makeInjectedModule(tokens2S)
)

// Combined
expectType<
  DIModule<typeof tokens1S & typeof tokens2S, 'tok11' | 'tok21' | 'tok12'>
>(makeInjectedModule(tokens1S).combine(makeInjectedModule(tokens2S)))

// Commutativity
expectType<
  DIModule<typeof tokens1S & typeof tokens2S, 'tok11' | 'tok21' | 'tok12'>
>(makeInjectedModule(tokens1S).combine(makeInjectedModule(tokens2S)))
expectType<
  DIModule<typeof tokens1S & typeof tokens2S, 'tok11' | 'tok21' | 'tok12'>
>(makeInjectedModule(tokens2S).combine(makeInjectedModule(tokens1S)))

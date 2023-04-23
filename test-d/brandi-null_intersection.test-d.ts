import { token } from 'brandi'
import { expectType } from 'tsd'
import { DIModule, makeInjectedModule } from '../src/brandi'

const tokens1 = {
  tok11: token<string>('some string'),
}
const tokens2 = {
  tok21: token<number>('some number'),
}

expectType<DIModule<typeof tokens1, 'tok11'>>(makeInjectedModule(tokens1))
expectType<DIModule<typeof tokens2, 'tok21'>>(makeInjectedModule(tokens2))

// Combined
expectType<DIModule<typeof tokens1 & typeof tokens2, 'tok11' | 'tok21'>>(
  makeInjectedModule(tokens1).combine(makeInjectedModule(tokens2))
)

// Commutativity
expectType<DIModule<typeof tokens1 & typeof tokens2, 'tok11' | 'tok21'>>(
  makeInjectedModule(tokens1).combine(makeInjectedModule(tokens2))
)
expectType<DIModule<typeof tokens1 & typeof tokens2, 'tok11' | 'tok21'>>(
  makeInjectedModule(tokens2).combine(makeInjectedModule(tokens1))
)

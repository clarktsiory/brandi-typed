export default {
  preset: 'ts-jest',
  transform: {
    '^.+\\.ts$': 'ts-jest',
  },
  roots: ["./tests"],
  moduleFileExtensions: ['ts', 'js']
}

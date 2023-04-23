# Brandi-Typed: A Dependency Injection Library for Dependency Modules
Brandi-Typed is an extension of the [Brandi](https://brandi.js.org/) dependency injection library, designed to provide fully typed dependency modules, making it impossible to get runtime dependency injection errors (like missing bindings).

# Installation
To install Brandi-Typed, use npm:

```bash
npm install brandi-typed
```
# Usage
First, declare your module by defining the _brandi_ tokens that serve to identify each dependency : 

```typescript

// module.ts

import { token } from 'brandi'
import { makeInjectedModule } from 'brandi-typed'
import { Service } from './application'
import { Repository } from './repositories'
import { Factory } from './factories'

export const TOKENS = {
  factory: token<Factory>('Factory'),
  repository: token<Repository>('Repository'),
  service: token<Service>('Service'),
} as const

export const module = makeInjectedModule(TOKENS)
```

The type information of `module` retains the types for `TOKENS` keys and values. 

Using this information, the `module` should only be used within a _brandi_ [Container](https://brandi.js.org/reference/container)
if all its tokens are bound to the instance implementation (singleton or transient, etc.).

To define your implementations :
 
```typescript

// bootstrap.ts

export const bootstraped = module
  .bind('factory', (bnd) => bnd.toInstance(FactoryImpl))
  .bind('repository', (bnd) => bnd.toInstance(RepositoryImpl))
  .bind('service', (bnd) => bnd.toInstance(ServiceImpl))

```

, then "compile" it to a _brandi_ [DependencyModule](https://brandi.js.org/reference/dependency-modules), that it usable from your container using the magic `make` method to do compile-time checking:

```typescript

// bootstrap.ts

export const dependencyModule = module
  .bind('factory', (bnd) => bnd.toInstance(FactoryImpl))
  .bind('repository', (bnd) => bnd.toInstance(RepositoryImpl))
  .bind('service', (bnd) => bnd.toInstance(ServiceImpl))
  .make()

//make sure to register injections:
injected(ServiceImpl, TOKENS.factory)  // using the brandi's `injected`
module.injector(ServiceImpl, 'factory') // or using the module's `injector` method
```

It ensures that all `bind` calls were made with all the initial tokens.

When registering injectors, the `module.injector` is a boilerplate that is less painful to write, 
because the tokens are already encoded as type information within `module`, and the token key can already be inferred. 
Therefore, in the exemple the argument 'factory' is provided by keyboard autocompletion, no need to import the `TOKENS` objects.

Hence, the library helps getting a boilerplate-free, 100% usable _brandi_ [DependencyModule](https://brandi.js.org/reference/dependency-modules) all with compile-time proofness !

# Usage with Brandi's Container
A _brandi_ [Container](https://brandi.js.org/reference/container#usetokensfrommodule) can use tokens from a _brandi_ [DependencyModule](https://brandi.js.org/reference/dependency-modules).
With Brandi-Typed, the module comes with an `allTokens` attributes which can be used to use all your module tokens in a container:

```typescript
container.use(...dependencyModule.allTokens).from(dependencyModule)
```

# Usage with multiple modules

Brandi-Typed provides operations to compose modules. Simply import the modules and use the `combine` method to merge them into a single module:

```javascript
import { module as module1 } from './module1'
import { module as module2 } from './module2'

export const module = module1.combine(module2)
```

All tokens from the combined modules will be available in the new module. You can then use the new module as described above.

You can even bind tokens from one module and combine already bound tokens from another module, which will be useful for bootstraping each one of you modules separately:

```javascript
import { bootstraped as bootstraped1 } from './bootstrap1'
import { module as module2 } from './module2'

export const bootstraped2With1 = bootstraped1
  .combine(module2)
  .bind('mod2token', /* */) 
  .make()  // call to make() if all tokens in combined modules are bound
```


# Conclusion
Brandi-Typed simplifies the process of dependency injection and helps developers avoid common mistakes and runtime errors. With its strongly-typed tokens, it ensures that all dependencies are properly resolved at compile time and provides a more streamlined way to declare your modules in TypeScript projects.

# License

APACHE 2.0

# Contributing

Brandi-Typed is an open source project and we welcome contributions. Please create an issue or pull request if you find any bugs or have any suggestions.

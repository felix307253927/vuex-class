# vuex-class-decorator
Via [vuex-class](https://github.com/ktsn/vuex-class)
Binding helpers for Vuex and vue-class-component

## Dependencies

- [Vue](https://github.com/vuejs/vue)
- [Vuex](https://github.com/vuejs/vuex)
- [vue-class-component](https://github.com/vuejs/vue-class-component)

## Installation

```bash
$ npm i -S vuex-class-decorator
```

## Example

```js
import Vue from 'vue'
import {
  State,
  Getter,
  Action,
  Mutation,
  GetterSetter,
  Component,
  namespace
} from 'vuex-class'

const someModule = namespace('path/to/module')

@Component
export class MyComp extends Vue {
  @State('foo') stateFoo
  @State(state => state.bar) stateBar
  @Getter('foo') getterFoo
  @Action('foo') actionFoo
  @Mutation('foo') mutationFoo
  @someModule.Getter('foo') moduleGetterFoo
  @GetterSetter('getterKey','setterKey') gsFoo     //getterKey ---> getters , setterKey --> actions

  // If the argument is omitted, use the property name
  // for each state/getter/action/mutation type
  @State foo
  @Getter bar
  @Action baz
  @Mutation qux
  @GetterSetter gsBar
  @someModule.GetterSetter name

  created () {
    this.stateFoo // -> store.state.foo
    this.stateBar // -> store.state.bar
    this.getterFoo // -> store.getters.foo
    this.actionFoo({ value: true }) // -> store.dispatch('foo', { value: true })
    this.mutationFoo({ value: true }) // -> store.commit('foo', { value: true })
    this.moduleGetterFoo // -> store.getters['path/to/module/foo']
    this.gsBar  // -> store.getters.gsBar
    this.gsBar = 1      // -> store.dispatch('gsBar', 1)
    this.gsFoo = 'test' // -> store.dispatch('setterKey', 'test')
    this.name         // -> store.getters['path/to/module/name']
    this.name = 'myname' // -> store.dispatch('path/to/module/name', 'myname')
  }
}
```

## License

MIT

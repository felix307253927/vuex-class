import Vue from 'vue'
import VComponent, { createDecorator } from 'vue-class-component'
import {
  mapState,
  mapGetters,
  mapActions,
  mapMutations,
  Store,
} from 'vuex'

export const Component = VComponent

export type VuexDecorator = <V extends Vue> (proto: V, key: string) => void

export type StateTransformer = (state: any, getters: any) => any

export type MapHelper = typeof mapState | typeof mapGetters
  | typeof mapActions | typeof mapMutations | any

export interface BindingOptions {
  namespace?: string,
  setKey?: string
}

interface MyObject extends Object {
  [key: string]: any
  [key: number]: any
}

export interface BindingHelper {
  <V extends Vue>(proto: V, key: string): void
  (type: string, options?: BindingOptions): VuexDecorator
}

export interface StateBindingHelper extends BindingHelper {
  (type: StateTransformer, options?: BindingOptions): VuexDecorator
}

export interface SetterBindingHelper extends BindingHelper {
  (type: string, options?: BindingOptions | string): VuexDecorator
}

export interface BindingHelpers {
  State: StateBindingHelper
  Getter: BindingHelper
  Mutation: BindingHelper
  Action: BindingHelper,
  GetterSetter: SetterBindingHelper
}


export const State = createBindingHelper('computed', mapState) as StateBindingHelper

export const Getter = createBindingHelper('computed', mapGetters)

export const Action = createBindingHelper('methods', mapActions)

export const Mutation = createBindingHelper('methods', mapMutations)

function normalizeNamespace(fn: Function) {
  return function (namespace: string | MyObject, map: string | MyObject, setKey: string) {
    if (typeof namespace !== 'string') {
      setKey = <string>map
      map = namespace;
      namespace = '';
    } else if (namespace.charAt(namespace.length - 1) !== '/') {
      namespace += '/';
    }
    return fn(namespace, map, setKey)
  }
}

function normalizeMap(map: Array<string> | MyObject) {
  return Array.isArray(map)
    ? map.map(function (key) { return ({ key: key, val: key }); })
    : Object.keys(map).map(function (key) { return ({ key: key, val: map[key] }); })
}

function getModuleByNamespace(store: MyObject, helper: string, namespace: string) {
  var module = store["_modulesNamespaceMap"][namespace];
  if (process.env.NODE_ENV !== 'production' && !module) {
    console.error(("[vuex] module namespace not found in " + helper + "(): " + namespace));
  }
  return module
}


export const GetterSetter = createBindingHelper('computed', normalizeNamespace(function (namespace: any, map: any, setKey: string): any {
  var res: MyObject = {};
  normalizeMap(map).forEach(function (ref) {
    var key = ref.key;
    var val = ref.val;
    setKey = setKey || val
    res[key] = {
      get: function () {
        const _key = namespace + val;
        if (namespace && !getModuleByNamespace(this.$store, 'mapGetter', namespace)) {
          return
        }
        if (process.env.NODE_ENV !== 'production' && !(_key in this.$store.getters)) {
          console.error(("[vuex] unknown getter: " + _key));
          return
        }
        return this.$store.getters[_key]
      },
      set: function (...args: any[]) {
        var dispatch = this.$store.dispatch;
        if (namespace) {
          var module = getModuleByNamespace(this.$store, 'mapAction', namespace);
          if (!module) {
            return
          }
          dispatch = module.context.dispatch;
        }
        return dispatch.apply(this.$store, [setKey].concat(args))
      }
    }
  });
  return res
})) as SetterBindingHelper

export function namespace(namespace: string): BindingHelpers
export function namespace<T extends BindingHelper>(
  namespace: string,
  helper: T
): T
export function namespace<T extends BindingHelper>(
  namespace: string,
  helper?: T
): any {
  function createNamespacedHelper(helper: T): T {
    // T is BindingHelper or StateBindingHelper
    function namespacedHelper(proto: Vue, key: string): void
    function namespacedHelper(type: any, options?: BindingOptions | string): VuexDecorator
    function namespacedHelper(a: Vue | any, b?: string | BindingOptions): VuexDecorator | void {
      if (a instanceof Vue) {
        const key: string = <string>b
        const proto: Vue = a
        return helper(key, { namespace, setKey: key })(proto, key)
      }
      const type = a
      const options = merge(b || {}, { namespace, setKey: <string>b })
      return helper(type, options)
    }

    return namespacedHelper as T
  }

  if (helper) {
    console.warn('[vuex-class] passing the 2nd argument to `namespace` function is deprecated. pass only namespace string instead.')
    return createNamespacedHelper(helper)
  }

  return {
    State: createNamespacedHelper(State as any),
    Getter: createNamespacedHelper(Getter as any),
    Mutation: createNamespacedHelper(Mutation as any),
    Action: createNamespacedHelper(Action as any),
    GetterSetter: createNamespacedHelper(GetterSetter as any)
  }
}

function createBindingHelper(
  bindTo: 'computed' | 'methods',
  mapFn: MapHelper
): BindingHelper {
  function makeDecorator(map: any, namespace: string | undefined, setKey?: string) {
    return createDecorator((componentOptions, key) => {
      if (!componentOptions[bindTo]) {
        componentOptions[bindTo] = {}
      }

      const mapObject = { [key]: map }

      componentOptions[bindTo]![key] = namespace !== undefined
        ? mapFn(namespace, mapObject, setKey)[key]
        : mapFn(mapObject, setKey)[key]
    })
  }

  function helper(proto: Vue, key: string): void
  function helper(type: any, options?: BindingOptions | string): VuexDecorator
  function helper(a: Vue | any, b?: string | BindingOptions): VuexDecorator | void {
    if (a instanceof Vue) {
      const key: string = <string>b
      const proto: Vue = a
      return makeDecorator(key, key)(proto, key)
    }
    const namespace = extractNamespace(b)
    const type = a
    let setKey
    if (!b) {
      setKey = a
    } else if (typeof b === 'string') {
      setKey = b
    } else {
      setKey = b.setKey || a
    }
    return makeDecorator(type, namespace, setKey)
  }

  return helper
}

function extractNamespace(options: BindingOptions | string | undefined): string | undefined {
  if (!options || typeof options === 'string') {
    return undefined
  }
  const n = options && options.namespace

  if (typeof n !== 'string') {
    return undefined
  }

  if (n[n.length - 1] !== '/') {
    return n + '/'
  }

  return n
}

function merge<T, U>(a: T, b: U): T & U {
  const res: any = {}
    ;[a, b].forEach((obj: any) => {
      Object.keys(obj).forEach(key => {
        res[key] = obj[key]
      })
    })
  return res
}

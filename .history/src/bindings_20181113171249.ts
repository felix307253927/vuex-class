import Vue from 'vue'
import { createDecorator } from 'vue-class-component'
import {
  mapState,
  mapGetters,
  mapActions,
  mapMutations,
  Store
} from 'vuex'

export type VuexDecorator = <V extends Vue> (proto: V, key: string) => void

export type StateTransformer = (state: any, getters: any) => any

export type MapHelper = typeof mapState | typeof mapGetters
  | typeof mapActions | typeof mapMutations

export interface BindingOptions {
  namespace?: string
}

export interface BindingHelper {
  <V extends Vue>(proto: V, key: string): void
  (type: string, options?: BindingOptions): VuexDecorator
}

export interface StateBindingHelper extends BindingHelper {
  (type: StateTransformer, options?: BindingOptions): VuexDecorator
}

export interface BindingHelpers {
  State: StateBindingHelper
  Getter: BindingHelper
  Mutation: BindingHelper
  Action: BindingHelper,
  GetterSetter: BindingHelper
}

export const State = createBindingHelper('computed', mapState) as StateBindingHelper

export const Getter = createBindingHelper('computed', mapGetters)

export const Action = createBindingHelper('methods', mapActions)

export const Mutation = createBindingHelper('methods', mapMutations)

function normalizeMap(map: Array<string> | Object) {
  return Array.isArray(map)
    ? map.map(function (key) { return ({ key: key, val: key }); })
    : Object.keys(map).map(function (key) { return ({ key: key, val: map[key] }); })
}

function getModuleByNamespace(store: Store<any>, helper: string, namespace: string) {
  var module = store._modulesNamespaceMap[namespace];
  if (process.env.NODE_ENV !== 'production' && !module) {
    console.error(("[vuex] module namespace not found in " + helper + "(): " + namespace));
  }
  return module
}


export const GetterSetter = createBindingHelper('computed', function (namespace: string, getters: Array<string> | Object) {
  var res: { [key: string]: any } = {};
  normalizeMap(getters).forEach(function (ref) {
    var key = ref.key;
    var val = ref.val;

    val = namespace + val;
    res[key] = {
      get: function () {
        if (namespace && !getModuleByNamespace(this.$store, 'mapGetter', namespace)) {
          return
        }
        if (process.env.NODE_ENV !== 'production' && !(val in this.$store.getters)) {
          console.error(("[vuex] unknown getter: " + val));
          return
        }
        return this.$store.getters[val]
      },
      set: function(value: any){
        var args = [], len = arguments.length;
      while ( len-- ) args[ len ] = arguments[ len ];

      var dispatch = this.$store.dispatch;
      if (namespace) {
        var module = getModuleByNamespace(this.$store, 'mapActions', namespace);
        if (!module) {
          return
        }
        dispatch = module.context.dispatch;
      }
      return typeof val === 'function'
        ? val.apply(this, [dispatch].concat(args))
        : dispatch.apply(this.$store, [val].concat(args))
      }
    }
  });
  return res
})
function setter(setKey: string) {
  return function (target: Vue, key: string) {
    let store = target.$store
    Reflect.defineProperty(target, key, {
      set(v: any) {
        store.dispatch(setKey, v)
      }
    })
  }
}

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
    function namespacedHelper(type: any, options?: BindingOptions): VuexDecorator
    function namespacedHelper(a: Vue | any, b?: string | BindingOptions): VuexDecorator | void {
      if (typeof b === 'string') {
        const key: string = b
        const proto: Vue = a
        return helper(key, { namespace })(proto, key)
      }

      const type = a
      const options = merge(b || {}, { namespace })
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
    GetterSetter: function (setKey: string) {
      return GetterSetter(`${namespace}/${setKey}`)
    }
  }
}

function createBindingHelper(
  bindTo: 'computed' | 'methods',
  mapFn: MapHelper
): BindingHelper {
  function makeDecorator(map: any, namespace: string | undefined) {
    return createDecorator((componentOptions, key) => {
      if (!componentOptions[bindTo]) {
        componentOptions[bindTo] = {}
      }

      const mapObject = { [key]: map }

      componentOptions[bindTo]![key] = namespace !== undefined
        ? mapFn(namespace, mapObject)[key]
        : mapFn(mapObject)[key]
    })
  }

  function helper(proto: Vue, key: string): void
  function helper(type: any, options?: BindingOptions): VuexDecorator
  function helper(a: Vue | any, b?: string | BindingOptions): VuexDecorator | void {
    if (typeof b === 'string') {
      const key: string = b
      const proto: Vue = a
      return makeDecorator(key, undefined)(proto, key)
    }

    const namespace = extractNamespace(b)
    const type = a
    return makeDecorator(type, namespace)
  }

  return helper
}

function extractNamespace(options: BindingOptions | undefined): string | undefined {
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

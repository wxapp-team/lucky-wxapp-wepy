import wepy from 'wepy'
import {isFunction, isObject} from './cmn';

const REQUEST_METHODS = [
  'GET', 'POST', 'HEAD', 'DELETE', 'OPTIONS', 'PUT', 'PATCH'
];

class Request {
  defaultOptions = {
    method: 'POST',
    header: {
      'content-type': 'application/json'
    },
    prefix: '',             // request prefix
    beforeRequest: null,    // before request check, return false or a rejected Promise will stop request
    afterResponse: null,    // after request hook
  }

  constructor(opts = {}) {
    this._options = {
      ...this.defaultOptions,
      ...opts
    }

    // normalize the header
    const header = this._options.header

    for (let h in header) {
      if (h !== h.toLowerCase()) {
        header[h.toLowerCase()] = header[h]
        delete header[h]
      }
    }

    REQUEST_METHODS.forEach((method) => {
      this[method.toLowerCase()] = (url, data, opts = {}) => {
        opts.data = data;
        return this.send(url, {...opts, method})
      }
    })
  }

  /**
   * Set Options
   *
   * Examples:
   *
   *   .config('method', 'GET')
   *   .config({header: {'content-type': 'application/json'}})
   *
   * @param {String|Object} key
   * @param {Any} value
   * @return {Request}
   */
  config = (key, value) => {
    const options = this._options

    if (typeof key === 'object') {
      for (let k in key) {
        options[k] = key[k]
      }
    } else {
      options[key] = value
    }

    return this;
  }

  prefix = (prefix) => {
    if (prefix && typeof prefix === 'string') this._options.prefix = prefix;
    return this;
  }

  beforeRequest = (cb) => {
    const options = this._options
    if (cb && typeof cb === 'function') {
      options.beforeRequest = cb
    }
    return this;
  }

  afterResponse = (cb) => {
    const options = this._options
    if (cb && typeof cb === 'function') {
      options.afterResponse = cb
    }
    return this;
  }

  /**
   * Set header
   *
   * Examples:
   *
   *   .header('Accept', 'application/json')
   *   .header({ Accept: 'application/json' })
   *
   * @param {String|Object} key
   * @param {String} value
   * @return {Request}
   */
  header = (key, value) => {
    const {header} = this._options;

    if (isObject(key)) {
      for (let k in key) {
        header[k.toLowerCase()] = key[k]
      }
    } else if (isFunction(key)) {
      header.__headerFun__ = key;
    } else {
      header[key.toLowerCase()] = value
    }

    return this;
  }

  /**
   * Set Content-Type
   *
   * @param {String} type
   */
  contentType = (type) => {
    const {header} = this._options;

    switch (type) {
      case 'json':
        type = 'application/json'
        break;
      case 'form':
      case 'urlencoded':
        type = 'application/x-www-form-urlencoded;charset=UTF-8'
        break;
      case 'multipart':
        type = 'multipart/form-data'
        break;
    }

    header['content-type'] = type;
    return this;
  }

  // send request
  send = (url, opts = {}) => new Promise((resolve, reject) => {
    if (typeof url !== 'string') {
      return reject(new Error('invalid url'));
    }

    const options = {...this._options, ...opts};

    const { beforeRequest, afterResponse, prefix, header, ...fetchOpts } = options;

    const {__headerFun__, ...realheader} = header;
    let newheader = {...realheader};
    if (__headerFun__) {
      const _newheader = __headerFun__();
      if (_newheader && isObject(_newheader)) {
        newheader = {...realheader, ..._newheader}
      }
    }

    if (beforeRequest && typeof beforeRequest === 'function' && beforeRequest(url, options) === false) {
      return reject(new Error('request canceled by beforeRequest'))
    }

    wepy.request({
      url: prefix + url,
      header: newheader,
      success: ({data, statusCode, header}) => {
        if (isFunction(afterResponse)) {
          const after = afterResponse({data, statusCode, header});
          if (after && after.then) {
            after.then(afterResp => {
              return resolve(afterResp);
            })
          } else {
            return resolve(after);
          }
        } else {
          return resolve(data);
        }
      },
      fail: (err) => {
        reject(err);
      },
      ...fetchOpts,
    });
  })
}

const codeMessage = {
  200: '服务器成功返回请求的数据',
  201: '新建或修改数据成功。',
  202: '一个请求已经进入后台排队（异步任务）',
  204: '删除数据成功。',
  400: '发出的请求有错误，服务器没有进行新建或修改数据,的操作。',
  401: '用户没有权限（令牌、用户名、密码错误）。',
  403: '用户得到授权，但是访问是被禁止的。',
  404: '发出的请求针对的是不存在的记录，服务器没有进行操作',
  405: '禁用请求中指定的方法（方法禁用）',
  406: '请求的格式不可得。',
  410: '请求的资源被永久删除，且不会再得到的。',
  422: '当创建一个对象时，发生一个验证错误。',
  500: '服务器发生错误，请检查服务器',
  502: '网关错误',
  503: '服务不可用，服务器暂时过载或维护',
  504: '网关超时',
};

function checkStatus(response) {
  if (response.status >= 200 && response.status < 300) {
    return response;
  }
  const errortext = codeMessage[response.status] || response.statusText;

  const error = new Error(errortext);
  error.name = response.status;
  error.response = response;
  return error;
}

export default new Request();

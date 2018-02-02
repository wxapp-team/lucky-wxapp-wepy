import request from './request';
/**
 * 导出常用请求函数到全局，其它高级配置使用 '.request.xxx()'
 * 或直接 import request from 'cmn-utils/lib/request';
 */
const requestConfig = request.config;
const requestHeader = request.header;
const send = request.send;
const get = request.get;
const post = request.post;
const head = request.head;
const del = request.delete;
const put = request.put;

const L = {
  // request api
  request,
  requestConfig,
  requestHeader,
  send,
  get,
  post,
  head,
  del,
  put,
  // util
  ...require('./cmn')
};

if (L.__esModule) delete L.__esModule;
export { request };
export default L;

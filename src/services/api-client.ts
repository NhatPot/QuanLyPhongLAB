import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios';
import { isMockDataMode } from './data-mode';
import { createMockApiAdapter } from './mock-api-adapter';

export const apiClient = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || '/api',
  withCredentials: true,
  headers: { 'Content-Type': 'application/json' },
});

// Mock mode is deliberately opt-in. SQL/API remains the default for normal use.
if (isMockDataMode) {
  apiClient.defaults.adapter = createMockApiAdapter();
}

type PendingRequest = { resolve:(token:string)=>void; reject:(error:unknown)=>void };
let isRefreshing=false;
let failedQueue:PendingRequest[]=[];
const processQueue=(error:unknown,token?:string)=>{failedQueue.forEach(p=>error?p.reject(error):p.resolve(token!));failedQueue=[]};

apiClient.interceptors.response.use(
  response=>response,
  async(error:AxiosError)=>{
    const original=error.config as (InternalAxiosRequestConfig & {_retry?:boolean})|undefined;
    if(!original||error.response?.status!==401||original._retry||original.url?.includes('/auth/login')||original.url?.includes('/auth/refresh')) return Promise.reject(error);
    if(isRefreshing){return new Promise<string>((resolve,reject)=>failedQueue.push({resolve,reject})).then(token=>{original.headers.Authorization=`Bearer ${token}`;return apiClient(original)})}
    original._retry=true;isRefreshing=true;
    try{
      const response=await axios.post(`${apiClient.defaults.baseURL}/auth/refresh`,{}, {withCredentials:true});
      const token=response.data.data.accessToken as string;
      apiClient.defaults.headers.common.Authorization=`Bearer ${token}`;
      original.headers.Authorization=`Bearer ${token}`;
      processQueue(null,token);
      return apiClient(original);
    }catch(refreshError){processQueue(refreshError);throw refreshError}finally{isRefreshing=false}
  }
);

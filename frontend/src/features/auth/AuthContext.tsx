'use client';
import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { authApi, type UserProfile, type LoginPayload } from '@/services/auth-api';
import { apiClient } from '@/services/api-client';

interface AuthContextType { user:UserProfile|null;isAuthenticated:boolean;isLoading:boolean;login:(payload:LoginPayload)=>Promise<UserProfile>;logout:()=>Promise<void>;changePassword:(current:string,next:string)=>Promise<void>;refresh:()=>Promise<UserProfile|null>;hasPermission:(permission:string)=>boolean;hasAnyRole:(roles:string[])=>boolean }
const AuthContext=createContext<AuthContextType|undefined>(undefined);

export function AuthProvider({children}:{children:React.ReactNode}){
  const [user,setUser]=useState<UserProfile|null>(null);const [isLoading,setIsLoading]=useState(true);
  const fetchCurrentUser=async()=>{try{const profile=await authApi.getMe();setUser(profile);return profile}catch{setUser(null);return null}finally{setIsLoading(false)}};
  useEffect(()=>{void fetchCurrentUser()},[]);
  const login=async(payload:LoginPayload)=>{setIsLoading(true);try{const data=await authApi.login(payload);apiClient.defaults.headers.common.Authorization=`Bearer ${data.accessToken}`;const profile=await fetchCurrentUser();if(!profile)throw new Error('Không thể tải thông tin người dùng');return profile}catch(error){setIsLoading(false);throw error}};
  const logout=async()=>{setIsLoading(true);try{await authApi.logout()}catch{}finally{setUser(null);delete apiClient.defaults.headers.common.Authorization;setIsLoading(false)}};
  const changePassword=async(current:string,next:string)=>{await authApi.changePassword(current,next);setUser(value=>value?{...value,mustChangePassword:false}:value)};
  const refresh=async()=>{try{const session=await authApi.refresh();apiClient.defaults.headers.common.Authorization=`Bearer ${session.accessToken}`}catch{}return fetchCurrentUser()};
  const value=useMemo<AuthContextType>(()=>({user,isAuthenticated:!!user,isLoading,login,logout,changePassword,refresh,hasPermission:(permission)=>!!user&&(user.roles.includes('ADMIN')||user.permissions.includes(permission)),hasAnyRole:(roles)=>!!user&&roles.some(role=>user.roles.includes(role))}),[user,isLoading]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
export function useAuth(){const context=useContext(AuthContext);if(!context)throw new Error('useAuth must be used within AuthProvider');return context}

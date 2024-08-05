import { TSearchFilteredData, TSearchTarget } from '../Types/Search.ts';
import { cloneDeep } from 'lodash';

let _Filtered_Data: TSearchFilteredData | null = null;

let _Search_Target_Token_Cache: TSearchTarget[] = []; // a history of all searches that were set programmatically
let _Search_Target_Token: TSearchTarget | null = null; //this will be "consumed" after getting

export function GetLastSearchTargetToken(): Readonly<TSearchTarget> | null {
  if (!_Search_Target_Token_Cache) return null;

  const tmp = { ..._Search_Target_Token };
  _Search_Target_Token = null;
  return tmp;
}

export function SetSearchTargetToken({ ...newSearchTarget }: TSearchTarget) {
  if (!newSearchTarget) return;
  _Search_Target_Token_Cache.push(newSearchTarget);
  _Search_Target_Token = { ...newSearchTarget };
}

export function GetAllFilteredData(): Readonly<TSearchFilteredData> | null {
  if (!_Filtered_Data) return null;

  return cloneDeep(_Filtered_Data);
}

export function SetFilteredData({ ...newData }: TSearchFilteredData) {
  if (!_Filtered_Data) _Filtered_Data = {};
  if (!newData) return;
  _Filtered_Data = cloneDeep(newData);
}

import { get } from 'lodash';

export function getWithDefault<
  T,
  K1 extends keyof T,
  K2 extends keyof T[K1],
  K3 extends keyof T[K1][K2],
  K4 extends keyof T[K1][K2][K3],
  K5 extends keyof T[K1][K2][K3][K4],
  K6 extends keyof T[K1][K2][K3][K4][K5],
  K7 extends keyof T[K1][K2][K3][K4][K5][K6],
  K8 extends keyof T[K1][K2][K3][K4][K5][K6][K7]
  >(
  obj: T,
  defaultValue: T[K1][K2][K3][K4][K5][K6][K7][K8],
  path1: K1, path2: K2, path3: K3, path4: K4, path5: K5, path6: K6, path7: K7, path8: K8,
): T[K1][K2][K3][K4][K5][K6][K7][K8];
export function getWithDefault<
  T,
  K1 extends keyof T,
  K2 extends keyof T[K1],
  K3 extends keyof T[K1][K2],
  K4 extends keyof T[K1][K2][K3],
  K5 extends keyof T[K1][K2][K3][K4],
  K6 extends keyof T[K1][K2][K3][K4][K5],
  K7 extends keyof T[K1][K2][K3][K4][K5][K6]
  >(
  obj: T,
  defaultValue: T[K1][K2][K3][K4][K5][K6][K7],
  path1: K1, path2: K2, path3: K3, path4: K4, path5: K5, path6: K6, path7: K7,
): T[K1][K2][K3][K4][K5][K6][K7];
export function getWithDefault<
  T,
  K1 extends keyof T,
  K2 extends keyof T[K1],
  K3 extends keyof T[K1][K2],
  K4 extends keyof T[K1][K2][K3],
  K5 extends keyof T[K1][K2][K3][K4],
  K6 extends keyof T[K1][K2][K3][K4][K5]
  >(
  obj: T,
  defaultValue: T[K1][K2][K3][K4][K5][K6],
  path1: K1, path2: K2, path3: K3, path4: K4, path5: K5, path6: K6,
): T[K1][K2][K3][K4][K5][K6];
export function getWithDefault<
  T,
  K1 extends keyof T,
  K2 extends keyof T[K1],
  K3 extends keyof T[K1][K2],
  K4 extends keyof T[K1][K2][K3],
  K5 extends keyof T[K1][K2][K3][K4]
  >(
  obj: T,
  defaultValue: T[K1][K2][K3][K4][K5],
  path1: K1, path2: K2, path3: K3, path4: K4, path5: K5,
): T[K1][K2][K3][K4][K5];
export function getWithDefault<
  T,
  K1 extends keyof T,
  K2 extends keyof T[K1],
  K3 extends keyof T[K1][K2],
  K4 extends keyof T[K1][K2][K3]
  >(
  obj: T,
  defaultValue: T[K1][K2][K3][K4],
  path1: K1, path2: K2, path3: K3, path4: K4,
): T[K1][K2][K3][K4];
export function getWithDefault<
  T,
  K1 extends keyof T,
  K2 extends keyof T[K1],
  K3 extends keyof T[K1][K2]
  >(
  obj: T, defaultValue: T[K1][K2][K3], path1: K1, path2: K2, path3: K3,
): T[K1][K2][K3];
export function getWithDefault<T, K1 extends keyof T, K2 extends keyof T[K1]>(
  obj: T, defaultValue: T[K1][K2], path1: K1, path2: K2,
): T[K1][K2];
export function getWithDefault<T, K1 extends keyof T>(
  obj: T, defaultValue: T[K1], path: K1,
): T[K1];
export function getWithDefault<T>(obj: T, defaultValue: any, ...paths: string[]): any {
  return get(obj, paths, defaultValue);
}

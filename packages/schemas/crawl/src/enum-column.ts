import { customType } from "drizzle-orm/sqlite-core";

export const Enum = <U extends string, T extends Readonly<[U, ...U[]]>>(name: string, config: { enum: T }) => customType<{
  data: T[number];
  driverData: number;
  config: { enum: T }
}>({
  dataType() {
    return 'integer' // Sets sql column data type to integer
  },
  toDriver(value) {
    return config.enum.indexOf(value);
  },
  fromDriver(value) {
    return config.enum[value] as T[number];
  }
})(name, config);


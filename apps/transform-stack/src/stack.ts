import {
  type StackContext,
} from "sst/constructs";

export function TransformStack({ stack }: StackContext) {
  stack.addOutputs({
    hello: "world",
  });
}

#!/bin/bash
source .env || exit 1

assert_var() {
    local var_name="$1"

    if [[ -z "${!var_name}" ]]; then
        echo "Error: The environment variable '$var_name' is not set."
        exit 1
    fi
}

assert_var "STAGE"
assert_var "TENANT_DATABASE_AUTH_TOKEN"
assert_var "SUPER_DATABASE_AUTH_TOKEN"
assert_var "CLERK_SECRET_KEY"
assert_var "REDIS_URL"
assert_var "REDIS_TOKEN"
assert_var "CRON_USER_ID"

npx -w ./apps/stack sst secrets set TENANT_DATABASE_AUTH_TOKEN $TENANT_DATABASE_AUTH_TOKEN --stage=$STAGE
npx -w ./apps/stack sst secrets set SUPER_DATABASE_AUTH_TOKEN $SUPER_DATABASE_AUTH_TOKEN --stage=$STAGE
npx -w ./apps/stack sst secrets set SUPER_DATABASE_URL $SUPER_DATABASE_URL --stage=$STAGE
npx -w ./apps/stack sst secrets set CLERK_SECRET_KEY $CLERK_SECRET_KEY --stage=$STAGE
npx -w ./apps/stack sst secrets set REDIS_URL $REDIS_URL --stage=$STAGE
npx -w ./apps/stack sst secrets set REDIS_TOKEN $REDIS_TOKEN --stage=$STAGE
npx -w ./apps/stack sst secrets set CRON_USER_ID $CRON_USER_ID --stage=$STAGE

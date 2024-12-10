FROM rabbitmq:4.0-management-alpine

ENV RABBITMQ_NODENAME=rabbit@localhost

COPY ./services/rabbitmq/rabbitmq.conf /etc/rabbitmq/rabbitmq.conf
COPY ./services/rabbitmq/definition.json /etc/rabbitmq/definitions/definition.json

RUN --mount=type=secret,id=RABBITMQ_USER \
    --mount=type=secret,id=RABBITMQ_PASSWORD \
    --mount=type=secret,id=RABBITMQ_MANAGER_USER \
    --mount=type=secret,id=RABBITMQ_MANAGER_PASSWORD \
    RABBITMQ_USER="$(cat /run/secrets/RABBITMQ_USER)" \
    RABBITMQ_PASSWORD="$(cat /run/secrets/RABBITMQ_PASSWORD)" \
    RABBITMQ_MANAGER_USER="$(cat /run/secrets/RABBITMQ_MANAGER_USER)" \
    RABBITMQ_MANAGER_PASSWORD="$(cat /run/secrets/RABBITMQ_MANAGER_PASSWORD)" \
    && cat > /etc/rabbitmq/definitions/users.json <<EOF
{
  "users": [
    {
      "name": "$RABBITMQ_USER",
      "password": "$RABBITMQ_PASSWORD",
      "tags": []
    },
    {
      "name": "$RABBITMQ_MANAGER_USER",
      "password": "$RABBITMQ_MANAGER_PASSWORD",
      "tags": [
        "administrator"
      ]
    }
  ],
  "permissions": [
    {
      "user": "$RABBITMQ_USER",
      "vhost": "/",
      "configure": ".*",
      "read": ".*",
      "write": ".*"
    },
    {
      "user": "$RABBITMQ_MANAGER_USER",
      "vhost": "/",
      "configure": ".*",
      "read": ".*",
      "write": ".*"
    }
  ]
}
EOF

RUN rabbitmq-plugins --offline enable rabbitmq_shovel rabbitmq_shovel_management

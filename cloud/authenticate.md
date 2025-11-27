# Authelia

## docs

```
authelia v4.38.19

An open-source authentication and authorization server providing
two-factor authentication and single sign-on (SSO) for your
applications via a web portal.

General documentation is available at: https://www.authelia.com/
CLI documentation is available at: https://www.authelia.com/reference/cli/authelia/authelia/

Usage:
  authelia [flags]
  authelia [command]

Examples:
authelia --config /etc/authelia/config.yml --config /etc/authelia/access-control.yml
authelia --config /etc/authelia/config.yml,/etc/authelia/access-control.yml
authelia --config /etc/authelia/config/

Available Commands:
  access-control  Helpers for the access control system
  build-info      Show the build information of Authelia
  completion      Generate the autocompletion script for the specified shell
  config          Perform config related actions
  crypto          Perform cryptographic operations
  help            Help about any command
  storage         Manage the Authelia storage
  validate-config Check a configuration against the internal configuration validation mechanisms

Flags:
  -c, --config strings                        configuration files or directories to load, for more information run 'authelia -h authelia config' (default [configuration.yml])
      --config.experimental.filters strings   list of filters to apply to all configuration files, for more information run 'authelia -h authelia filters'

Additional help topcis:
  authelia config          Help for the config file/directory paths
  authelia filters         help topic for the config filters
  authelia hash-password   help topic for hashing passwords
  authelia time-layouts    help topic for the various time layouts

Use "authelia [command] --help" for more information about a command.

Help Topic: hash-password

The 'authelia hash-password' command has been replaced with the
'authelia crypto hash generate' command. Run 'authelia crypto hash generate --help'
for more information.

It was replaced for a few reasons. Specifically it was confusing to users
due to arguments which only had an effect on one algorithm and not the other,
and the new command makes the available options a lot clearer. In addition
the old command was not compatible with all of the available algorithms the
new one is compatible for and retrofitting it would be incredibly difficult.
```

## setup for pi 

* wget https://github.com/authelia/authelia/releases/download/v4.38.19/authelia-v4.38.19-linux-arm64.tar.gz
* tar -xf authelia-v4.38.19-linux-arm64.tar.gz
* chmod +x authelia-linux-arm64

### users

> ./authelia-linux-arm64 crypto hash generate --password 'password2000'

```
skid@pi5m2:~/authelia $ cat users.yml
users:
  skid:
    displayname: "𓅷skid"
    password: "$argon2id$v=19$m=65536,t=3,p=4$AeO6WeE...
    email: nitrologic@gmail.com
```

### config

```
skid@pi5m2:~/authelia $ cat config.template.yml
# configuration.yml – pure local, zero dependencies beyond the binary
theme: dark
server:
  address: tcp://127.0.0.1:9091/
log:
  level: debug

storage:
  encryption_key: "test-storage-key-123456789....
  local:
    path: ./data/db.sqlite3

notifier:
  filesystem:
    filename: ./data/notification.txt

authentication_backend:
  file:
    path: ./users.yml

session:
  name: authelia_session
  secret: "4a3772aa63bfa0b081a05ed6fa9...
  expiration: 1h
  inactivity: 5m
  cookies:
    - domain: demo.local
      authelia_url: https://auth.demo.local

access_control:
  default_policy: deny
  rules:
    - domain: ["a.demo.local", "b.demo.local", "*.demo.local"]
      policy: one_factor

identity_providers:
  oidc:
    hmac_secret: "0123456789abcdef0123456789abc...
    jwks:
      - key: |
          -----BEGIN EC PRIVATE KEY-----
          -----END EC PRIVATE KEY-----
        key_id: authelia
        algorithm: RS256
        use: sig
    clients:
      - client_id: nginx
        client_secret: "$pbkdf2-sha512$310000$73616c74$6...
        public: false
        authorization_policy: one_factor
        redirect_uris:
          - https://a.demo.local/oauth2/callback
          - https://b.demo.local/oauth2/callback
        scopes: [openid, profile, email, groups]

identity_validation:
  reset_password:
    jwt_secret: this-is-just-a-test-jwt-secret-12345678901234567890
```

### test

```
skid@pi5m2:~/authelia $ ./authelia-linux-arm64 --config config.template.yml
time="2025-11-26T19:29:13Z" level=debug msg="Loaded Configuration Sources" files="[/home/skid/authelia/config.template.yml]" filters="[]"
time="2025-11-26T19:29:13Z" level=debug msg="Logging Initialized" fields.level=debug file= format= keep_stdout=false
time="2025-11-26T19:29:13Z" level=debug msg="Process user information" gid=1000 gids="4,20,24,27,29,44,46,60,100,102,105,106,995,994,993" uid=1000 username=skid
time="2025-11-26T19:29:13Z" level=info msg="Authelia v4.38.19 is starting"
time="2025-11-26T19:29:13Z" level=info msg="Log severity set to debug"
time="2025-11-26T19:29:13Z" level=debug msg="Registering client nginx with policy one_factor (one_factor)"
time="2025-11-26T19:29:13Z" level=info msg="Storage schema is being checked for updates"
time="2025-11-26T19:29:13Z" level=info msg="Storage schema is already up to date"
time="2025-11-26T19:29:13Z" level=debug msg="Create Server Service (metrics) skipped"
time="2025-11-26T19:29:13Z" level=info msg="Startup complete"
time="2025-11-26T19:29:13Z" level=info msg="Listening for non-TLS connections on '127.0.0.1:9091' path '/'" server=main service=server
```

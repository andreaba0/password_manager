create table users (
    id bigserial primary key,
    email text unique not null,
    username text unique not null,
    salt bytea not null,
    public_key bytea not null,
    created_at timestamp default current_timestamp
);

create table root_keys (
    id bigserial primary key,
    user_id bigint not null,
    e_main_key_root_key bytea not null,
    e_recovery_key_root_key bytea not null,
    created_at timestamp default current_timestamp
);

create table data_types (
    id bigserial primary key,
    name text not null,
    created_at timestamp default current_timestamp
);

create table user_roles (
    id bigserial primary key,
    name text not null,
    created_at timestamp default current_timestamp
);

create table session_keys (
    id uuid primary key,
    private_key bytea not null CHECK (octet_length(private_key) = 64),
    public_key bytea not null CHECK (octet_length(public_key) = 32),
    created_at timestamp default current_timestamp
);

create table credential_blobs (
    id bigserial primary key,
    user_id bigint not null,
    data_type_id bigint not null,
    data bytea not null,
    e_dek bytea not null,
    created_at timestamp default current_timestamp
);

create table signup_request_logs (
    id bigserial primary key,
    token text not null,
    created_at timestamp default current_timestamp
);

create table fake_salt_secrets (
    id bigserial primary key,
    secret bytea not null,
    created_at timestamp default current_timestamp
);

create table users (
    id bigserial primary key,
    email text unique not null,
    username text unique not null,
    password text not null,
    salt text not null,
    signature text not null,
    created_at timestamp default current_timestamp
);

create table root_keys (
    id bigserial primary key,
    user_id bigint not null,
    root_key text not null,
    e_private_key text not null,
    public_key text not null,
    created_at timestamp default current_timestamp
);

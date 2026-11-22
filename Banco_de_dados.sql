create database Cardapio_WEB;

use Cardapio_WEB;

create table categoria(
    id_categoria  int not null auto_increment primary key,
    nome_categoria varchar(45) UNIQUE,
    descricao_categoria varchar(255) DEFAULT ''
);

create table pratos(
    id_prato int not null auto_increment primary key,
    nome_prato varchar(45),
    desc_prato varchar(255),
    preco_prato float not null,
    id_categoria_prato int not null,
    disponivel int DEFAULT 1,
    foreign key (id_categoria_prato) references categoria(id_categoria) ON DELETE RESTRICT
);
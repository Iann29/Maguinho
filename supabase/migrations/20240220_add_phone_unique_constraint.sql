-- Adiciona constraint de telefone único
ALTER TABLE users
ADD CONSTRAINT users_phone_key UNIQUE (phone);

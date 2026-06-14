-- Update seed items to use local image references and add 2 more items

UPDATE items SET image_url = 'local://guitar' WHERE id = 1;
UPDATE items SET image_url = 'local://macbook' WHERE id = 2;
UPDATE items SET image_url = 'local://jacket' WHERE id = 3;
UPDATE items SET image_url = 'local://headphones' WHERE id = 4;
UPDATE items SET image_url = 'local://bike' WHERE id = 5;
UPDATE items SET image_url = 'local://switch' WHERE id = 6;
UPDATE items SET image_url = 'local://camera' WHERE id = 7;
UPDATE items SET image_url = 'local://desk' WHERE id = 8;

INSERT INTO items (user_id, name, description, points_value, status, image_url) VALUES
  ('00000000-0000-0000-0000-000000000002', 'Custom Skateboard', 'Element deck with Bones Swiss bearings and Spitfire wheels. Well loved but rides smooth.', 60, 1, 'local://skateboard'),
  ('00000000-0000-0000-0000-000000000003', 'Mechanical Keyboard', 'Keychron Q1 with Gateron Brown switches. Hot-swappable, aluminum frame.', 90, 1, 'local://keyboard');

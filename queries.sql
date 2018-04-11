use bamazon;

select sum(price) from products
where department_name='Electronics';

select * from products;



---------------------
-- add dept id to products table
UPDATE products p SET department_id = 
(SELECT department_id FROM departments WHERE department_name = p.department_name);

SELECT * FROM products;

------------

update departments
set over_head_costs = 6500.99
where department_name = 'Grocery';

select * from departments;
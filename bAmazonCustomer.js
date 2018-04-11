require('dotenv').config();

var inquirer = require('inquirer');
var clear = require('clear');
var conCol = require('colors');

var mySQL = require('mysql');
var connection = mySQL.createConnection({
  host: process.env.RDS_HOSTNAME,
  user: process.env.RDS_USERNAME,
  password: process.env.RDS_PASSWORD,
  port: process.env.RDS_PORT,
  database: process.env.RDS_DB,
});
const prodToDisp = 5;
var selectOffset = 0;
var totalProducts = 0;

connection.connect();

connection.query('SELECT COUNT(*) as cnt FROM products', (err, res, fl) => {
  if (err) throw err;
  totalProducts = parseInt(res[0]['cnt']);
  console.log(typeof totalProducts);
  loadProducts();
});

function loadProducts() {
  clear();
  connection.query(
    `SELECT * FROM products LIMIT ${prodToDisp} OFFSET ${selectOffset}`,
    function(error, results, fields) {
      if (error) throw error;
      var choices = [];
      for (var i in results) {
        var prod = results[i];
        var str = `Product Name: ${prod.product_name
          .toString()
          .padEnd(30, ' ')} - Price: $${prod.price
          .toString()
          .padStart(
            6,
            ' '
          )} - Qty on hand: ${prod.stock_quantity
          .toString()
          .padStart(4, ' ')} - Item No: ${prod.item_id
          .toString()
          .padStart(4, ' ')}`;
        choices.push(str);
      }
      //enter choice for previous/next 5 products
      if (selectOffset > 0) choices.push('Previous 5 Products');
      if (selectOffset + prodToDisp < totalProducts)
        choices.push('Next 5 Products');
      //choice to end buying session
      choices.push('Exit');

      inquirer
        .prompt([
          {
            type: 'list',
            message: 'What would you like to buy?',
            choices: choices,
            name: 'picked',
          },
        ])
        .then((data) => {
          var choice = data.picked.split(' ')[0];
          //load next/previous products
          switch (choice) {
            case 'Next':
              selectOffset += 5;
              loadProducts();
              break;
            case 'Previous':
              selectOffset -= 5;
              loadProducts();
              break;
            case 'Product':
              var item_id = parseInt(data.picked.split('Item No:')[1].trim());
              var qtyOnHand = parseInt(
                data.picked
                  .split('Qty on hand:')[1]
                  .split('-')[0]
                  .trim()
              );
              console.log(item_id + '  ' + qtyOnHand);
              buyProduct(item_id, qtyOnHand);
              break;
            default:
              connection.end();
              break;
          }
        });
    }
  );
}

function buyProduct(item_id, qtyOnHand) {
  console.log('buying');
  inquirer
    .prompt([
      {
        type: 'type',
        message: 'Enter # of Items to buy:',
        validate: (num) => {
          return validateInput(num, qtyOnHand);
        },
        name: 'qtyToBuy',
      },
    ])
    .then((data) => {
      console.log(data);
    });
}

function validateInput(char, qtyOnHand) {
  char = parseInt(char);
  if (!/[\d]/.test(char)) {
    return 'Enter digits only';
  } else if (char > qtyOnHand) {
    return `Sorry, maximum items availble to purchase: ${qtyOnHand}. Re-enter qty to purchase`;
  } else return true;
}

var clear = require('clear');

//inquirer
var inquirer = require('inquirer');
var inq = inquirer.createPromptModule();

//mysql
var connection = require('./dbConnection');
const prodToDisp = 5;
var selectOffset = 0;
var totalProducts = 0;
var displayedProducts = [];

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

      displayedProducts = [...results]; //store current products in arr for future use
      var choices = [];
      for (var i in results) {
        var indx = parseInt(i) + 1; //arr index to retrive product later
        prod = results[i];
        var str = `${indx} Product Name: ${prod.product_name
          .toString()
          .padEnd(50, ' ')} - Price: $${prod.price
          .toString()
          .padStart(
            8,
            ' '
          )} - Qty on hand: ${prod.stock_quantity
          .toString()
          .padStart(4, ' ')} - Item No: ${prod.item_id
          .toString()
          .padStart(4, ' ')}`;

        choices.push(str);
      }
      //enter choice for previous/next 5 products
      if (selectOffset > 0) choices.push('# Previous 5 Products');
      if (selectOffset + prodToDisp < totalProducts)
        choices.push('# Next 5 Products');
      //choice to end buying session
      choices.push('# Exit');

      inq([
        {
          type: 'list',
          message: 'What would you like to buy?',
          choices: choices,
          name: 'picked',
        },
      ]).then((data) => {
        var choice = data.picked
          .split(' ')[1]
          .split(' ')[0]
          .trim();
        console.log(choice);
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
            buyProduct(data.picked);
            break;
          default:
            connection.end();
            break;
        }
      });
    }
  );
}

function buyProduct(prod) {
  var prodPicked = displayedProducts[parseInt(prod.split(' ')[0].trim()) - 1];
  var item_id = prodPicked.item_id;
  var qtyOnHand = parseInt(prodPicked.stock_quantity);
  var price = parseFloat(prodPicked.price);

  inq([
    {
      type: 'type',
      message: 'Enter # of Items to buy:',
      validate: (num) => {
        return validateInput(num, qtyOnHand);
      },
      name: 'qty',
    },
  ]).then((data) => {
    inq([
      {
        type: 'confirm',
        message: `Confirm your purchase of ${
          prodPicked.product_name
        } - Price - $${price} 
        Order QTY - ${data.qty} - Total cost: $${(price * data.qty).toFixed(
          2
        )}`,
        name: 'purchased',
      },
    ]).then((d) => {
      if (d.purchased) executePurchase(prodPicked, data.qty);
      else {
        console.log(`  No worries, let's try again`);
        setTimeout(() => {
          loadProducts();
        }, 1500);
      }
    });
  });
}

function executePurchase(prod, qty) {
  connection.query(
    'SELECT stock_quantity FROM products WHERE item_id=?',
    [prod.item_id],
    (err, res, fl) => {
      if (err) console.log(err);
      //check if enough qty avail to sell
      if (qty < res[0].stock_quantity) {
        var updatedPS = prod.product_sales + qty * prod.price; //updated prod sales
        var updatedOHQ = prod.stock_quantity - qty; //updated qty on hand

        console.log(
          '  Thank you for your order. Your purchase will be shipped shortly'
        );

        connection.query(
          'UPDATE products SET stock_quantity= ?, product_sales = ? WHERE item_id = ?',
          [updatedOHQ, updatedPS, prod.item_id],
          (err, res, fl) => {
            if (err) console.log(err);

            //back to product listing..
            selectOffset = 0;
            setTimeout(() => {
              loadProducts();
            }, 1500);
          }
        );
      } else {
        console.log(
          `  Oops, not enough qty available to complete this purchase. Let's try again`
        );
        setTimeout(() => {
          loadProducts();
        }, 1500);
      }
    }
  );
}

function validateInput(char, qtyOnHand) {
  char = parseInt(char);
  if (!/[\d]/.test(char)) {
    return 'Enter digits only';
  } else if (char > qtyOnHand) {
    return `Sorry, maximum items availble to purchase: ${qtyOnHand}. Re-enter qty to purchase`;
  } else return true;
}

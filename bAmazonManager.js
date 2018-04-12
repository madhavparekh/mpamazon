var clear = require('clear');

//inquirer
var inquirer = require('inquirer');
var inq = inquirer.createPromptModule();

//table
var { table } = require('table');
var tableHeader = [
  'Item ID',
  'Product Name',
  'Department Name',
  'Price',
  'Qty on hand',
  'Product Sales',
];
//table column alignment
var config = {
  columns: {
    0: {
      alignment: 'right',
    },
    1: {
      alignment: 'left',
    },
    2: {
      alignment: 'left',
    },
    3: {
      alignment: 'right',
    },
    4: {
      alignment: 'right',
    },
    5: {
      alignment: 'right',
    },
  },
};

//mysql
var connection = require('./dbConnection');
const prodToDisp = 5;
var selectOffset = 0;
var totalProducts = 0;
var displayedProducts = [];

connection.connect((err) => {
  if (err) console.log(err);
  loadManagerPrompt();
});

function loadManagerPrompt() {
  var choices = [
    '1. View Products for Sale',
    '2. View Low Inventory',
    '3. Add to Inventory',
    '4. Add New Product',
    '5. Exit',
  ];

  inq([
    {
      type: 'list',
      message: 'Pick from one of the following task',
      choices: choices,
      name: 'task',
    },
  ]).then((data) => {
    clear();
    switch (data.task.split('.')[0].trim()) {
      case '1':
        loadProductsTable();
        break;
      case '2':
        loadProductsTable('WHERE stock_quantity < 6');
        break;
      case '3':
        addToInventory();
        break;
      case '4':
        loadProductsTable();
        break;
      default:
        connection.end();
        break;
    }
  });
}

function addToInventory() {}

function loadProductsTable(opt) {
  var queryOpt = opt || '';

  //get data length
  //get length of table for pagination
  connection.query(
    `SELECT COUNT(*) as cnt FROM products ${queryOpt}`,
    (err, res, fl) => {
      err ? console.log(err) : null;

      totalProducts = parseInt(res[0]['cnt']);

      dispTable(queryOpt);
    }
  );

  function dispTable(queryOpt) {
    clear();
    var tableData = [];

    tableData.push(tableHeader);

    connection.query(
      `SELECT * FROM products ${queryOpt} LIMIT ${prodToDisp} OFFSET ${selectOffset}`,
      (err, res, fl) => {
        if (err) throw err;

        res.forEach((e) => {
          var rowData = [];
          rowData.push(
            e.item_id,
            e.product_name,
            e.department_name,
            `$${e.price.toFixed(2)}`,
            e.stock_quantity,
            `$${e.product_sales.toFixed(2)}`
          );
          tableData.push(rowData);
        });

        console.log(table(tableData, config));

        var choices = [];
        //enter choice for previous/next 5 products
        if (selectOffset > 0) choices.push('Previous 5 Products');
        if (selectOffset + prodToDisp < totalProducts)
          choices.push('Next 5 Products');
        //choice to end buying session
        choices.push('Exit ');

        inq([
          {
            type: 'list',
            message: 'Display:',
            choices: choices,
            name: 'scroll',
          },
        ]).then((data) => {
          switch (data.scroll.split(' ')[0]) {
            case 'Next':
              selectOffset += 5;
              dispTable(queryOpt);
              break;
            case 'Previous':
              selectOffset -= 5;
              dispTable(queryOpt);
              break;
            default:
              selectOffset = 0;
              loadManagerPrompt();
              break;
          }
        });
      }
    );
  }
}

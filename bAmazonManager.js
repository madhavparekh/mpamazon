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
  clear();
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
        addNewProduct();
        break;
      default:
        connection.end();
        break;
    }
  });
}

function addNewProduct() {
  //get current departments
  var prod = {
    dept_name: '',
    prod_name: '',
    price: 0.0,
    qty: 0,
  };

  connection.query(
    `SELECT department_name FROM departments`,
    (err, res, fl) => {
      if (err) console.log(err);
      else {
        var isNewDept = false;
        var depts = [];
        res.forEach((e) => {
          depts.push(e.department_name);
        });
        depts.push('Enter new department');

        inq([
          {
            type: 'input',
            message: `Enter product name:`,
            // validate: (name) => {
            //   return validateString(name);
            // },
            name: 'name',
          },
          {
            type: 'input',
            message: `Enter price:`,
            validate: (num) => {
              return validateDecimal(num);
            },
            name: 'price',
          },
          {
            type: 'input',
            message: `Enter QTY:`,
            validate: (qty) => {
              return validateInput(qty);
            },
            name: 'qty',
          },
          {
            type: 'list',
            message: `Choose department name:`,
            choices: depts,
            name: 'dept',
          },
          {
            type: 'input',
            message: 'Enter new Dept. name',
            when: (d) => {
              return d.dept === 'Enter new department';
            },
            validate: (data)=>{
              isNewDept = true;
              return true;
            },
            name: 'dept',
          },
        ]).then((data) => {
          connection.query(
            `INSERT INTO products (product_name, department_name, price, stock_quantity) VALUES (?,?,?,?)`,
            [data.name, data.dept, data.price, data.qty],
            (err, res, fl) => {
              if (err) console.log(err);
              else {
                console.log(`  New product ${data.name} added`);

                //adding new dept to departments
                if (isNewDept) {
                  addNewDept(data.dept);
                  isNewDept = false;
                }

                setTimeout(() => {
                  loadManagerPrompt();
                }, 1500);
              }
            }
          );
        });
      }
    }
  );
}

function addNewDept(dept) {
  connection.query(
    `INSERT INTO departments (department_name) VALUES (?)`,
    [dept],
    (err, res, fl) => {
      if (err) console.log(err);
      else {
        console.log(`  Updated Departments`);
      }
    }
  );
}

function addToInventory() {
  inq([
    {
      type: 'type',
      message: `Enter Item's ID`,
      validate: (id) => {
        return validateInput(id);
      },
      name: 'id',
    },
    {
      type: 'type',
      message: 'Enter QTY to add to inventory',
      validate: (qty) => {
        return validateInput(qty);
      },
      name: 'qty',
    },
  ]).then((data) => {
    connection.query(
      `UPDATE products p INNER JOIN products p1 ON (p.item_id = p1.item_id AND p.item_id=${
        data.id
      })
    SET p.stock_quantity = p1.stock_quantity + ${data.qty}`,
      (err, res, fl) => {
        if (err) console.log(err);
        else {
          //if id didn't match
          if (!res.changedRows) {
            console.log(`  Error: Please enter a valid Item ID`);
            setTimeout(() => {
              addToInventory();
            }, 1500);
          } else {
            //if id matched
            console.log(
              `  QTY: ${data.qty} successfully added to item_id: ${data.id}`
            );
            setTimeout(() => {
              loadManagerPrompt();
            }, 1500);
          }
        }
      }
    );
  });
}

function validateString(str) {
  if (!/\w-{10,50}/.test(str)) {
    return 'Alpha Numerical charactors only';
  } else return true;
}

function validateInput(num) {
  num = parseInt(num);
  if (!/\d+/.test(num)) {
    return 'Enter digits only';
  } else return true;
}

function validateDecimal(num) {
  num = parseFloat(num);
  if (!/(\d+\.\d{2})/.test(num)) {
    return 'Enter digits only';
  } else return true;
}

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
}

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

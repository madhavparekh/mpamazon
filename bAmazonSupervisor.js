var clear = require('clear');

//inquirer
var inquirer = require('inquirer');
var inq = inquirer.createPromptModule();

//table
var { table } = require('table');
var tableHeader = [
  'Department ID',
  'Department Name',
  'Over Head Cost',
  'Product Sales',
  'Gross Profit',
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
      alignment: 'right',
    },
    3: {
      alignment: 'right',
    },
    4: {
      alignment: 'right',
    },
  },
};

//mysql
var connection = require('./dbConnection');
const prodToDisp = 5;
var selectOffset = 0;
var totalDept = 0;
var displayedDept = [];

connection.connect((err) => {
  if (err) console.log(err);
  else {
    loadSupPrompt();
  }
});

function loadSupPrompt() {
  clear();
  var choices = [
    '1. View Product Sales by Department',
    '2. Add New Department',
    "3. Update Department's Over Head Cost",
    '4. Exit',
  ];

  inq([
    {
      type: 'list',
      message: 'Pick from one of the following task:',
      choices: choices,
      name: 'task',
    },
  ]).then((data) => {
    clear();
    switch (data.task.split('.')[0].trim()) {
      case '1':
        loadDeptTable();
        break;
      case '2':
        addNewDept();
        break;
      case '3':
        updateDeptOHC();
        break;
      default:
        connection.end();
        break;
    }
  });
}

function updateDeptOHC() {
  inq([
    {
      type: 'type',
      message: `Enter Dept's ID: `,
      validate: (id) => {
        return validateInput(id);
      },
      name: 'id',
    },
    {
      type: 'type',
      message: 'Enter Over Head Cost: ',
      validate: (num) => {
        return validateDecimal(num);
      },
      name: 'ohc',
    },
  ]).then((data) => {
    connection.query(
      `UPDATE departments d INNER JOIN departments d1 ON (d.department_id = d1.department_id AND d.department_id=${
        data.id
      })
      SET d.over_head_costs = ${data.ohc}`,
      (err, res, fl) => {
        if (err) console.log(err);
        else {
          //if id didn't match
          if (!res.changedRows) {
            console.log(`  Error: Please enter a valid Item ID`);
            setTimeout(() => {
              updateDeptOHC();
            }, 1500);
          } else {
            //if id matched
            console.log(
              `  Overhead cost of Dept ID: ${
                data.id
              } successfully updated to $${data.ohc}`
            );
            setTimeout(() => {
              loadSupPrompt();
            }, 1500);
          }
        }
      }
    );
  });
}

function validateInput(num) {
  num = parseInt(num);
  if (!/\d+/.test(num)) {
    return 'Enter digits only';
  } else return true;
}

function addNewDept() {
  //get existing dept to validate name against..
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

        inq([
          {
            type: 'input',
            message: 'Enter Dept. Name: ',
            validate: (dpt) => {
              return validateDept(dpt, depts);
            },
            name: 'dept',
          },
          {
            type: 'input',
            message: 'Enter Over Head Cost for Dept: ',
            validate: (num) => {
              return validateDecimal(num);
            },
            name: 'ohc',
          },
        ]).then((data) => {
          connection.query(
            `INSERT INTO departments (department_name, over_head_costs) VALUES (?, ?)`,
            [data.dept, data.ohc],
            (err, res, fl) => {
              if (err) console.log(err);
              else {
                console.log(`  Updated Departments`);
                setTimeout(() => {
                  loadSupPrompt();
                }, 1500);
              }
            }
          );
        });
      }
    }
  );
}

function validateDept(str, depts) {
  if (!/\w{3}/.test(str)) return 'Alpha Numerical charactors only';
  else if (depts.indexOf(str) !== -1) return 'Dept already exists';
  else return true;
}
function validateDecimal(num) {
  num = parseFloat(num);
  if (!/(\d+\.\d{2})/.test(num)) {
    return 'Enter digits only';
  } else return true;
}

function loadDeptTable() {
  //get data length
  //get length of table for pagination
  connection.query(
    `SELECT COUNT(*) as cnt FROM departments`,
    (err, res, fl) => {
      if (err) console.log(err);
      else {
        totalProducts = parseInt(res[0]['cnt']);

        dispTable();
      }
    }
  );
}

function dispTable() {
  clear();

  //update dept. table with product_sales data
  connection.query(
    `UPDATE departments d INNER JOIN (SELECT p.department_name AS pd, sum(p.product_sales) AS ps FROM products p GROUP BY p.department_name) p1 ON d.department_name = pd SET d.product_sales = ps`,
    (err, res, fl) => {
      if (err) console.log(err);
    }
  );

  var tableData = [];

  tableData.push(tableHeader);

  connection.query(
    `SELECT * FROM departments LIMIT ${prodToDisp} OFFSET ${selectOffset}`,
    (err, res, fl) => {
      if (err) throw err;

      res.forEach((e) => {
        var rowData = [];
        var gp =
          e.gross_profit < 0
            ? `$(${(-1 * e.gross_profit).toFixed(2)})`
            : `$${e.gross_profit.toFixed(2)}`;

        rowData.push(
          e.department_id,
          e.department_name,
          `$${e.over_head_costs.toFixed(2)}`,
          `$${e.product_sales.toFixed(2)}`,
          gp
        );
        tableData.push(rowData);
      });

      console.log(table(tableData, config));

      var choices = [];
      //enter choice for previous/next 5 products
      if (selectOffset > 0) choices.push('Previous 5 Dept');
      if (selectOffset + prodToDisp < totalProducts)
        choices.push('Next 5 Dept');
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
            dispTable();
            break;
          case 'Previous':
            selectOffset -= 5;
            dispTable();
            break;
          default:
            selectOffset = 0;
            loadSupPrompt();
            break;
        }
      });
    }
  );
}

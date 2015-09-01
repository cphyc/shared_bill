'use strict';

var app = angular.module('transactions', ['ngRoute', 'ui.bootstrap', 'isteven-multi-select']);

app.config(function($routeProvider) {
  $routeProvider
    .when('/', {
      templateUrl: 'partials/home.html',
      controller: 'homeController'
    })
    .when('/transactions', {
      templateUrl: 'partials/transactions.html',
      controller: 'transactionsController'
    })
    .when('/add', {
      templateUrl: 'partials/add.html',
      controller: 'addController'
    });
});

app.controller('homeController', function($scope) {
  $scope.message = 'foo bar';
});

app.controller('transactionsController', function($scope, $http) {
  function createIfAbsent(results, user) {
    if (!results[user._id]) {
      results[user._id] = {
        amount: 0,
        user: user
      }
    }
  }

  var transactions = [],
      simplified = [];

  function updateResults() {
    $http.get('/api/transactions')
    .then(function(response) {
      Array.prototype.splice.apply(transactions, [0, 0].concat(response.data));

      var results = {};
      transactions.forEach(function(transaction) {
        transaction.toAsString = transaction.to
          .map(function(to) { return to.name; })
          .join(', ');
        transaction.fromAsString = transaction.from.name;

        var amount = parseInt(transaction.amount);
        createIfAbsent(results, transaction.from);

        results[transaction.from._id].amount = (results[transaction.from._id].amount) + amount;
        transaction.to.forEach(function(to) {
          createIfAbsent(results, to);
          results[to._id].amount = results[to._id].amount - (amount/transaction.to.length);
        });
      });

      $scope.results = results;

      var max = {
        value: 0
      }, min = {
        value : 0
      };

      while (true) {
        max = {
          value: 0
        };
        min = {
          value : 0
        };
        // Find the extremas
        for (var key in results) {
          if (results[key].amount - max.value > 1e-14) {
            max.key = key;
            max.value = results[key].amount;
          } else if (results[key].amount - min.value < -1e-14) {
            min.key = key;
            min.value = results[key].amount;
          }
        }

        if (min.value === 0 && max.value === 0) {
          break;
        }

        if (Math.abs(min.value) < Math.abs(max.value)) {
          results[min.key].amount = 0;
          results[max.key].amount += min.value;
          simplified.push({
            to: results[max.key].user.name,
            from: results[min.key].user.name,
            amount: -min.value
          });
        } else {
          results[max.key].amount = 0;
          results[min.key].amount += max.value;
          simplified.push({
            from: results[min.key].user.name,
            to: results[max.key].user.name,
            amount: max.value
          });
        }
      }
    });
  }

  updateResults();

  $scope.short_results = simplified;
  $scope.transactions = transactions;
  $scope.edit = function(transaction) {
    alert(transaction);
  };

  $scope.delete = function(transaction) {
    $http.delete('/api/transactions', {
      data: transaction
    }).then(function() {
      // Remove the transaction from the transaction list
      var index = transactions.indexOf(transaction);
      if (index > -1) {
        transactions.splice(index, 1);
        updateResults();
      }
    }, function() {
      console.log('error while deleting');
    });
  }
});

app.controller('addController', function($scope, $location, $http) {
  // default date = today
  $scope.transaction = {
    date: new Date()
  };

  $http.get('/api/users').then(function(response) {
    var people = response.data;
    // Select all of them by default
    people.forEach(function(p) {
      p.ticked = true;
    });
    $scope.people = people;
  });

  $scope.submit = function() {
    var newTransaction = {
      from: $scope.transaction.from._id,
      to: $scope.transaction.to.map(function(to) { return to._id; }),
      amount: $scope.transaction.amount,
      date: $scope.transaction.date
    };

    $http.post('/api/transactions', newTransaction,
      {headers: {"Content-Type": 'application/json'}})
    .then(function(response) {
      $location.path('#/transactions');
    }, function(response) {
      alert('An error occured', response);
      console.log(response);
    });
  }
});

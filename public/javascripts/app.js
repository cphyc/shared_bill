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

app.controller('homeController', function($scope, $rootScope, $modal) {
  $scope.message = 'foo bar';
  $scope.editTransaction = function(transaction) {
    var newScope = $rootScope.$new();
    newScope.transaction = transaction;
    newScope.edit = transaction ? true: false;
    newScope.modal = {
      title: newScope.edit ? 'Edit transaction' : 'New transaction'
    }

    $modal.open({
      templateUrl: 'partials/add.html',
      scope: newScope,
      controller: 'addController'
    });
  }
});

app.controller('transactionsController', function($scope, $http, $rootScope) {
  function createIfAbsent(results, user) {
    if (!results[user._id]) {
      results[user._id] = {
        amount: 0,
        user: user
      }
    }
  }

  $scope.transactions = [];

  $scope.updateResults = function() {
    $http.get('/api/transactions')
    .then(function(response) {
      $scope.transactions = response.data;
      $scope.simplified = [];

      var results = {};
      $scope.transactions.forEach(function(transaction) {
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

      $scope.results = angular.copy(results);

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
          $scope.simplified.push({
            to: results[max.key].user.name,
            from: results[min.key].user.name,
            amount: -min.value
          });
        } else {
          results[max.key].amount = 0;
          results[min.key].amount += max.value;
          $scope.simplified.push({
            from: results[min.key].user.name,
            to: results[max.key].user.name,
            amount: max.value
          });
        }
      }
    });
  }

  $scope.updateResults();
  $rootScope.$on('updateResults', function() { $scope.updateResults(); });

  $scope.delete = function(transaction) {
    $http.delete('/api/transactions', {
      data: transaction,
      headers: {"Content-Type": 'application/json'}
    }).then(function() {
      // Remove the transaction from the transaction list
      var index = $scope.transactions.indexOf(transaction);
      if (index > -1) {
        $scope.transactions.splice(index, 1);
        updateResults();
      }
    }, function() {
      console.log('Error while deleting');
    });
  }
});

app.controller('addController', function($scope, $location, $http, $rootScope) {
  if (!$scope.transaction) {
    $scope.transaction = {
      date: new Date()
    }
  } else {
    // reformat string
    $scope.transaction.date = new Date($scope.transaction.date);
  }

  $http.get('/api/users').then(function(response) {
    var people = response.data;
    // Select all of them by default
    var toIds = ($scope.transaction.to || []).map(function(to) {
      return to._id;
    });
    people.forEach(function(p) {
      if (toIds.length > 0) {
        p.ticked = toIds.indexOf(p._id) > -1;
      } else {
        p.ticked = true;
      }
    });
    $scope.people = people;
  });

  $scope.submit = function(transaction, edit, successCallback, errorCallback) {
    var newTransaction = {
      from: transaction.from._id,
      to: transaction.to.map(function(to) { return to._id; }),
      amount: transaction.amount,
      date: transaction.date
    };

    $http.post('/api/transactions', {
        edit: edit,
        transaction: newTransaction
      }, { headers: {"Content-Type": 'application/json'} })
    .then(function(response) {
      $rootScope.$broadcast('updateResults');
      (successCallback || function() {})();
    }, function(response) {
      alert('An error occured', response);
      console.log(response);
      (errorCallback || function() {})();
    });
  }
});

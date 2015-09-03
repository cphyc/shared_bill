'use strict';

var app = angular.module('transactions', ['ngRoute', 'ui.bootstrap', 'isteven-multi-select', 'angularMoment']);

app.run(function(amMoment) {
    amMoment.changeLocale('fr');
});

app.config(function($routeProvider) {
  $routeProvider
    .when('/', {
      templateUrl: 'partials/transactions.html',
      controller: 'transactionsController'
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
  $scope.showAllTransactions = false;
  var transactions = [];
  var shortTransactionList = [];
  $scope.shownTransactions = transactions;

  $scope.showTransactions = function(what) {
    if (what === 'all') {
      $scope.showAllTransactions = true;
      $scope.shownTransactions = transactions;
    } else if (what === 'past'){
      $scope.showAllTransactions = false;
      $scope.shownTransactions = shortTransactionList;
    } else {
      console.log('error');
    }

  }

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
      var now = moment();

      transactions = response.data;
      shortTransactionList = transactions.filter(function(t) {
        return now.isAfter(moment(t.date));
      });
      $scope.showTransactions('past');
      $scope.simplified = [];

      var results = {};
      transactions.forEach(function(transaction) {
        transaction.toAsString = transaction.to
          .map(function(to) { return to.name; })
          .join(', ');
        transaction.fromAsString = transaction.from.name;

        var rawAmount = parseInt(transaction.amount);
        createIfAbsent(results, transaction.from);

        // Count the number of occurences
        var count;
        var start = moment(transaction.date), end = moment(transaction.endDate);

        if (end.isAfter(now)) {
          end = now;
        }
        var duration = moment.duration(end - start);

        switch (transaction.frequency) {
          case 'yearly':
            count = Math.round(duration.asYears() + 1);
            break;
          case 'monthly':
            count = Math.round(duration.asMonths() + 1);
            break;
          case 'weekly':
            count = Math.round(duration.asWeeks() + 1);
            break;
          case 'daily':
            count = Math.round(duration.asDays() + 1);
            break
          default:
            count = 1;
        }

        var amount = rawAmount * count;

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
      var index = transactions.indexOf(transaction);
      if (index > -1) {
        transactions.splice(index, 1);
        $scope.updateResults();
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
    $scope.isRecurrent = $scope.transaction.frequency;
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
      date: transaction.date,
      note: transaction.note,
      endDate: transaction.endDate,
      frequency: transaction.frequency,
      _id: transaction._id
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

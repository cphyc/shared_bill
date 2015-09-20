$(document).ready(function() {
  // This command is used to initialize some elements and make them work properly
    $.material.init();
});

var app = angular.module('transactions', ['ngRoute', 'ui.bootstrap', 'isteven-multi-select', 'angularMoment', 'tableSort']);


(function() {
  'use strict';

  app.run(function(amMoment) {
      amMoment.changeLocale('fr');
  });

  app.constant('FREQUENCY_REGEXP', /^(\d+)$|^(1\/(\d+))$/); // matchs integers or fractions in the form 1/x')

  app.config(function($routeProvider) {
    $routeProvider
      .when('/', {
        templateUrl: 'partials/transactions',
        controller: 'transactionsController'
      })
      .when('/transactions', {
        templateUrl: 'partials/transactions',
        controller: 'transactionsController'
      })
      .when('/add', {
        templateUrl: 'partials/add',
        controller: 'addController'
      })
      .when('/users', {
        templateUrl: 'partials/users',
        controller: 'userController'
      })
      .when('/cleaningTasks', {
        templateUrl: 'partials/cleaning_tasks',
        controller: 'cleaningTasksController'
      });
  });

  app.filter('fraction', function() {
    return function(input) {
      input = parseFloat(input);
      if (input < 1) {
        return '1/' + Math.round(1/input);
      } else {
        return input;
      }
    };
  });

  // Filter out all event older than the given duration in the given unit
  app.filter('older', function() {
    return function(inputAsArray, duration, unit) {
      if (unit === 'ever') {
        return inputAsArray;
      } else {
        var tmp = inputAsArray.filter(function(input) {
          var len = moment.duration(duration, unit),
              date = moment(input.date),
              now = moment();

          if (date.isValid()) {
            return moment(now)
              .subtract(len)
              .isBefore(date);
          } else {
            return true;
          }
        });

        return tmp;
      }
    };
  });
})();

app.directive('frequency', function() {
  return {
    require: 'ngModel',
    link: function(scope, elm, attrs, ctrl) {
      ctrl.$validators.frequency = function(modelValue, viewValue) {
        if (ctrl.$isEmpty(modelValue)) {
          // consider empty models to be invalid
          return false;
        }

        if (INTEGER_REGEXP.test(viewValue)) {
          // it is valid
          return true;
        }

        // it is invalid
        return false;
      };
    }
  };
});

app.directive('pointSummary', function() {
  return {
    scope: {
      duration: '='
    },
    restrict: 'E',
    controller: function($scope, $http) {
      $http.get('/api/users').then(function(userAnswer) {
        var users = userAnswer.data;
        $http.get('/api/task_done').then(function(taskAnswer) {
          var tasksDone = taskAnswer.data;

          var people = {};
          users.forEach(function(user) {
            people[user._id] = user;
            people[user._id].points = 0;
          });

          tasksDone.forEach(function(taskDone) {
            if (!people[taskDone.by._id]) {
              console.log('Tâche effectuée par utilisateur absent.');
            } else {
              people[taskDone.by._id].points += taskDone.task.points || 0;
            }
          });

          $scope.people = [];
          for (var key in people) {
            $scope.people.push(people[key]);
          }
        });
      });
    },
    templateUrl: 'partials/cleaning_hall_of_fame_table.html'
  };
});

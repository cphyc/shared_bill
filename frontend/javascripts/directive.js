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
    restrict: 'E',
    controller: function($scope, $rootScope, taskDoneService) {
      $scope.$on('taskDone:updated', function() {
        $scope.people = taskDoneService.peopleSummary;
      });
      taskDoneService.update();
    },
    templateUrl: 'partials/cleaning_hall_of_fame_table.html'
  };
});

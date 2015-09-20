app.controller('homeController', function($scope, $rootScope, $modal) {
  $scope.editTransaction = function(transaction) {
    $rootScope.$broadcast('transactions:edit', transaction, 'edit');
  };
  $scope.createTransaction = function(transaction) {
    $rootScope.$broadcast('transactions:edit', transaction, 'create');
  };

  function editUser(user, action) {
    var newScope = $rootScope.$new();
    newScope.user = user;
    if (action === 'edit') {
      newScope.edit = true;
    } else if (action === 'create') {
      newScope.edit = false;
    } else {
      console.log('Unknown action', action);
    }

    newScope.modal = {
      title: newScope.edit ? 'Edit user' : 'New user'
    };

    $modal.open({
      templateUrl: 'partials/user_add.html',
      scope: newScope,
      controller: 'addUserController'
    });
  }

  $scope.editUser = function(user) {
    editUser(user, 'edit');
  };
  $scope.createUser = function(user) {
    editUser(user, 'create');
  };

  $scope.markTaskAsDone = function(task) {
    var newScope = $rootScope.$new();
    newScope.task = task;

    newScope.modal = {
      title: 'Marquer la tâche comme réalisée'
    };

    $modal.open({
      templateUrl: 'partials/cleaning_done.html',
      scope: newScope,
      controller: 'taskDoneController'
    });
  };
});

app.controller('transactionsController', function($scope, $rootScope, $modal, transactionsService) {
  $scope.showAllTransactions = false;
  var transactions = [];
  var shortTransactionList = [];
  var list = ['week', 'month', 'year'];

  $scope.shownTransactions = transactions;
  $scope.duration = 'week';
  $scope.durationAsString = moment.duration(1, $scope.duration).humanize();

  $scope.increaseDuration = function () {
    var id = list.indexOf($scope.duration);

    $scope.duration = list[id+1];
    if (id === -1 || id+1 === list.length) {
      $scope.duration = 'ever';
      $scope.durationAsString = 'depuis toujours';
    } else {
      $scope.durationAsString = moment.duration(1, $scope.duration).humanize();
    }
  };
  $scope.transactions = [];
  $scope.unsimplified = [];
  $scope.transactions = [];

  $rootScope.$on('transactions:updated', function() {
    $scope.unsimplified = transactionsService.unsimplified;
    $scope.simplified = transactionsService.simplified;
    $scope.transactions = transactionsService.transactions;
  });

  transactionsService.update();

  $scope.deleteTransaction = transactionsService.delete;

  $rootScope.$on('transactions:edit', function (event, transaction, action) {
    var newScope = $rootScope.$new();
    newScope.transaction = transaction;

    if (action === 'edit') {
      newScope.edit = true;
    } else if (action === 'create') {
      newScope.edit = false;
    } else {
      console.log('Unknown action', action);
    }
    newScope.modal = {
      title: newScope.edit ? 'Edit transaction' : 'New transaction'
    };

    $modal.open({
      templateUrl: 'partials/transaction_add.html',
      scope: newScope,
      controller: 'addTransactionController'
    });
  });
});

app.controller('addTransactionController', function($scope, transactionsService, usersService, $rootScope) {
  if (!$scope.transaction) {
    $scope.transaction = {
      date: new Date()
    };
  } else {
    // reformat string
    $scope.transaction.date = new Date($scope.transaction.date);
    $scope.isRecurrent = $scope.transaction.frequency;
  }

  $rootScope.$on('users:updated', function() {
    var people = usersService.users;
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

  usersService.update();

  $scope.submit = transactionsService.add;
});

app.controller('userController', function($scope, $rootScope, usersService) {
  $scope.deleteUser = usersService.delete;

  $rootScope.$on('users:updated', function() {
    $scope.users = usersService.users;
  });

  usersService.update();
});

app.controller('addUserController', function($scope, usersService) {
  $scope.submit = usersService.add;
});

app.controller('cleaningTasksController', function($scope, $rootScope, $modal, tasksService) {
  $rootScope.$on('tasks:updated', function() {
    $scope.tasks = tasksService.tasks;
  });

  tasksService.update();

  var editTask = function(task, edit) {
    var newScope = $rootScope.$new();
    newScope.edit = edit;
    newScope.task = task;
    newScope.modal = {
      title: 'Créer nouvelle tâche'
    };

    $modal.open({
      scope: newScope,
      templateUrl: 'partials/new_task.html',
      controller: 'newTaskController'
    });
  };

  $scope.editTask = function(task) {
    editTask(task, true);
  };
  $scope.newTask = function() {
    editTask(null, false);
  };
});



app.controller('newTaskController', function($scope, tasksService) {
  $scope.submit = tasksService.add;
});


app.controller('taskDoneController', function($scope, usersService, taskDoneService, $rootScope) {
  $scope.people = usersService.users;

  $scope.submit = taskDoneService.new;
});

angular.module('starter.controllers', [])

.controller('DashCtrl', function($scope, $rootScope) {
  var Seed = Parse.Object.extend('Seed');
  var Record = Parse.Object.extend('Record');
  var seedQuery = new Parse.Query(Seed);
  $scope.seeds = [];
  seedQuery.find({
    success: function(result){
      $scope.seeds = result;
      $scope.$apply();
    }
  })
  var now = new Date();
  $rootScope.new = '';
  $scope.adding = false;

  $scope.difference = function(then){
    if (now - then >= 86400000){
      var diff = Math.round((now - then)/86400000);
      var msg = diff + ' days';
    } else {
      var diff = Math.round((now-then)/3600000);
      var msg = diff + ' hours';
    }
    
    return msg;
  }

  $scope.addNew = function(){
    $scope.adding = true;
    var seed = new Seed();
    var time = new Date();
    seed.set('title', $rootScope.new);
    seed.save({
      success: function(result){
        $scope.seeds.unshift(result);
        $rootScope.new = '';
        $scope.adding = false;
        $scope.$apply();
        console.log(result);
        console.log($scope.seeds);
      },
      error: function(result, error){
        $scope.adding = false;
        console.log(error.message);
      }
    })
    // console.log('adding:' + $rootScope.new);
  }

  $scope.didIt = function(seed){
    var now = new Date();
    var record = new Record();
    record.set('seed', seed);
    record.save();
    seed.set('last', now);
    seed.save({
      success: function(result){
        seed = result;
      }
    })
  }
})

.controller('ChatsCtrl', function($scope, Chats) {
  // With the new view caching in Ionic, Controllers are only called
  // when they are recreated or on app start, instead of every page change.
  // To listen for when this page is active (for example, to refresh data),
  // listen for the $ionicView.enter event:
  //
  //$scope.$on('$ionicView.enter', function(e) {
  //});

  $scope.chats = Chats.all();
  $scope.remove = function(chat) {
    Chats.remove(chat);
  };
})

.controller('ChatDetailCtrl', function($scope, $stateParams, Chats) {
  $scope.chat = Chats.get($stateParams.chatId);
})

.controller('AccountCtrl', function($scope) {
  $scope.settings = {
    enableFriends: true
  };
});

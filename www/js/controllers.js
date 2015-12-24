angular.module('starter.controllers', [])

.controller('DashCtrl', function($scope, $rootScope, $location, $anchorScroll, $timeout, $ionicScrollDelegate, $ionicLoading) {
  $ionicLoading.show({
    template: 'Loading...'
  });
  var Seed = Parse.Object.extend('Seed');
  var Record = Parse.Object.extend('Record');
  var seedQuery = new Parse.Query(Seed);
  $scope.scrolling = false;
  // $scope.seeds = [];
  if(window.localStorage['seeds']){
    $scope.seeds = JSON.parse(window.localStorage['seeds']);
  } else {
    $scope.seeds = [];
  }
  
  // console.log($scope.seeds);
  seedQuery.find({
    success: function(result){
      var tempseeds = [];
      for (var i in result){
        tempseeds.push({'id': result[i].id, 'title': result[i].get('title'), 'last': result[i].get('last'), 'createdAt': result[i].createdAt});
      }
      window.localStorage['seeds'] = JSON.stringify(tempseeds);
      $scope.seeds = tempseeds;
      $scope.$apply();
      $ionicLoading.hide()
    },
    error: function(result, error){ 
      console.log(error.message);     
      $ionicLoading.hide()

    }
  })
  $scope.now = new Date();
  $rootScope.new = '';
  $scope.adding = false;

  $timeout(function(){
      $scope.now = new Date();
  }, 1000);
  $scope.difference = function(then){
    if(typeof then == 'string'){
      then = Date.parse(then);
    }
    if ($scope.now - then >= 86400000){
      var diff = Math.round(($scope.now - then)/86400000);
      var msg = diff + ' days';
    } else {
      var diff = Math.round(($scope.now-then)/3600000);
      var msg = diff + ' hours';
    }
    
    return msg;
  }

  $scope.status = function(seed){
    var then = seed.last;
      // console.log(now - then);
    if(then == undefined){
      var created = seed.createdAt;
      if(typeof created == 'string'){
        created = Date.parse(created);
      }
      if(($scope.now - created) <= 86400000){
        return 'new';
      } else if (($scope.now - created) <= (86400000 * 5)){
        return 'ok';
      } else {
        return 'bad';
      }
      
    } else {
      if(typeof then == 'string'){
        then = Date.parse(then);
      }
      if(($scope.now - then) <= (86400000 * 2)){
        return 'good';
      } else if (($scope.now - then) <= (86400000 * 5)){
        return 'ok';
      } else {
        return 'bad';
      }
    }
  }

  $scope.addNew = function(){
    $scope.adding = true;
    var seed = new Seed();
    var time = new Date();
    seed.set('title', $rootScope.new);
    seed.save({
      success: function(result){
        $scope.seeds.unshift({'id': result.id, 'title': result.get('title'), 'last': result.get('last'), 'createdAt': result.createdAt});
        $rootScope.new = '';
        $scope.adding = false;
        $scope.$apply();
        // console.log(result);
        // console.log($scope.seeds);
      },
      error: function(result, error){
        $scope.adding = false;
        console.log(error.message);
      }
    })
    // console.log('adding:' + $rootScope.new);
  }

  $scope.didIt = function(formattedseed){
    var now = new Date();
    var record = new Record();
    var seed = new Seed;
    seed.id = formattedseed.id;
    record.set('seed', seed);
    record.save();
    seed.set('last', now);
    seed.save({
      success: function(result){
        formattedseed.last = result.get('last');
        $scope.$apply();
      },
      error: function(result, error){
        console.log(error.message);
      }
    })
  }

  var jumping = false;
  $scope.scroll = function(anchor) 
  {
    jumping = true;
    $timeout(function(){
      jumping = false;
    }, 500)
    $location.hash(anchor);
    var handle = $ionicScrollDelegate.$getByHandle('content');
    handle.anchorScroll(false);
  };

  var lastpos;
  var scrolling = false;
  $scope.hidetop = function(){
    if(!jumping){
      var outside = $ionicScrollDelegate.$getByHandle('outside');
      var content = $ionicScrollDelegate.$getByHandle('content');
      var top = content.getScrollPosition().top;
      var maxoutsidetop = outside.getScrollView().__maxScrollTop;
      if(lastpos && top > lastpos){
        if(outside.getScrollPosition().top < maxoutsidetop && !scrolling){
          outside.scrollBottom(true);
        }
        scrolling = true;
        $timeout(function(){
          scrolling = false;
        }, 1000)
        
      } else if(lastpos && top < lastpos){
        if(outside.getScrollPosition().top != 0){
          outside.scrollTop(true);
        }
        
      }
    }
    lastpos = top;
    // console.log(lastpos);
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

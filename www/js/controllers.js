angular.module('starter.controllers', [])

.controller('DashCtrl', function($scope, $rootScope, $location, $anchorScroll, $timeout, $ionicScrollDelegate, $ionicLoading, $ionicPopup, $ionicListDelegate) {
  // $ionicLoading.show({
  //   template: 'Loading...'
  // });
  //check if a user is loggedin and assign value to currentUser
  if(Parse.User.current()){
    $rootScope.currentUser = Parse.User.current();
    $rootScope.currentUser.fetch();
  }
  $scope.loading = false;
  //a list of seeds that need to be uploaded
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
  if(window.localStorage['records']){
    var records = JSON.parse(window.localStorage['records']);
  } else {
    var records = [];
  }
  if(window.localStorage['newSeeds']){
    var newSeeds = JSON.parse(window.localStorage['newSeeds']);
  } else {
    var newSeeds = [];
  }
  if(window.localStorage['newRecords']){
    var newRecords = JSON.parse(window.localStorage['newRecords']);
  } else {
    var newRecords = [];
  }
  // if(window.localStorage['newUpdates']){
  //   var newUpdates = JSON.parse(window.localStorage['newUpdates']);
  // } else {
  //   var newUpdates = [];
  // }
  
  $scope.kill = function(seed) {
    $ionicListDelegate.closeOptionButtons();
   var confirmPopup = $ionicPopup.confirm({
     title: 'Kill it?',
     template: 'It cannot be undone.',
     okText: 'Yes, kill it.',
     okType: 'button-assertive'
   });

   confirmPopup.then(function(res) {
     if(res) {
      $scope.seeds.splice($scope.seeds.indexOf(seed), 1);
      if(newSeeds.indexOf(seed) >= 0){
        newSeeds.splice(newSeeds.indexOf(seed), 1);
      }
      localSave();
      $scope.$apply();
      if($rootScope.currentUser){
        var killseed = new Seed();
       killseed.id = seed.id;
       killseed.destroy({
        success: function(result){
          $scope.refresh();
        }
       });
      }
       
     } else {
       
     }
   });
 };

 $scope.login = function(){
  var user = new Parse.User();
  $scope.data = {};

  // An elaborate, custom popup
  var myPopup = $ionicPopup.show({
    template: '<label class="item item-input" style="margin-bottom: 5px"><input type="email" placeholder="Email" ng-model="data.email"></label><label class="item item-input"><input type="password" placeholder="Password" ng-model="data.pwd"></label>',
    title: 'Log in to sync',
    scope: $scope,
    buttons: [
      { text: 'Later' },
      {
        text: '<b>Register</b>',
        type: 'button-calm',
        onTap: function(e) {
          if (!$scope.data.email || !$scope.data.pwd) {
            //don't allow the user to close unless he enters wifi password
            e.preventDefault();
          } else {
            user.set('username', $scope.data.email);
            user.set('email', $scope.data.email);
            user.set('password', $scope.data.pwd);
            user.signUp(null, {
              success: function(user){
                $rootScope.currentUser = user;
                $rootScope.refresh();
              }, error: function(user, error){
                alert("Error: "+ error.code + " " + error.message);
              }
            })
          }
        }
      }
    ]
  });

  myPopup.then(function(res) {
    console.log('Tapped!', res);
  });

 }

 $scope.checkDisable = function(then){
  var now = new Date();
  if(then == undefined){
    return false;
  }
  if(typeof then == 'string'){
    then = Date.parse(then);
  }
  if(now - then <= 43200000){
    return true;
  } else {
    return false;
  }
 }
  // console.log($scope.seeds);
  var first = true;
  //upload new seeds to Parse
  function upload(){
    // console.log('upload');
    var uploaded_s = 0;
    var uploaded_r = 0;
    // var uploaded_u = 0;
    if(newSeeds.length >= 1 || newRecords.length >= 1){
      //upload the new seeds created
      for (var i in newSeeds){
        if(typeof newSeeds[i].createdAt == 'string'){
          var createdAt = Date.parse(newSeeds[i].createdAt);
        } else {
          var createdAt = newSeeds[i].createdAt;
        }
        var n_seed = new Seed();
        n_seed.set('title', newSeeds[i].title);
        n_seed.set('createdTime', newSeeds[i].createdAt);
        if(newSeeds[i].last){
          n_seed.set('last', newSeeds[i].last);
        }
        n_seed.set('user', $rootScope.currentUser);
        n_seed.set('legacy_id', newSeeds[i].id);
        n_seed.save({
          success: function(result){
            uploaded_s++;
            if (uploaded_s >= newSeeds.length){
              newSeeds = [];
              localSave();
              download();
            }
          }
        });
      }
      //upload new records and update seeds' lasts, need to go before seeds cus it uses legacy ids
      for (var j in newRecords){
        if(typeof newRecords[i].date == 'string'){
          var last = Date.parse(newRecords[i].date);
        } else {
          var last = newRecords[i].date;
        }
        var n_update = new Seed();
        var n_record = new Record();
        //upload new records
        n_record.set('seed', newRecords[j].seed);
        n_record.set('date', last);
        n_record.save({
          success: function(result){
            uploaded_r++;
            if (uploaded_r >= newRecords.length){
              newRecords = [];
              localSave();
              download();
            }
          }
        })
        //update last time of existing seeds if server side is newer, doesn't work if not uploaded seed
        var idQuery = new Parse.Query('Seed');
        var legacyQuery = new Parse.Query('Seed');
        legacyQuery.equalTo('legacy_id', newRecords[j].seed);
        idQuery.get(newRecords[j].seed, {
          success: function(result){
            n_update = result;
          },
          error: function(result, error){
            console.log(error.message);
            legacyQuery.find({
              success: function(result){
                n_update = result[0];
              },
              error: function(result, error){
                console.log(error.message);
              }
            })
          }
        })
        if(n_update.get('last') < last){
          n_update.set('last', last);
          n_update.save(); 
        }
      }
    } else {
      download();
    }
  }
  //get seeds from Parse
  function download(){
    // console.log('download');
    seedQuery.equalTo('user', $rootScope.currentUser);
    seedQuery.find({
      success: function(result){
        var tempseeds = [];
        for (var i in result){
          tempseeds.push({'id': result[i].id, 'title': result[i].get('title'), 'last': result[i].get('last'), 'createdAt': result[i].get('createdTime')});
        }
        window.localStorage['seeds'] = JSON.stringify(tempseeds);
        $scope.seeds = tempseeds;
        $scope.loading = false;
        // console.log('completed');
        $scope.$apply();
        // $ionicLoading.hide()
      },
      error: function(result, error){ 
        console.log(error.message);     
        // $ionicLoading.hide()
        $scope.loading = false;
        $scope.$apply();

      }
    })
  }


  $scope.refresh = function(){
    if($rootScope.currentUser){
      $scope.loading = true;
      upload();
    } else {
      if(!first){
        $scope.login();
      }
    }
    first = false;
      
  }

  $scope.refresh();
    
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

  function localSave(){
    window.localStorage['seeds'] = JSON.stringify($scope.seeds);
    window.localStorage['records'] = JSON.stringify(records);
    window.localStorage['newSeeds'] = JSON.stringify(newSeeds);
    window.localStorage['newRecords'] = JSON.stringify(newRecords);
  }

  $scope.addNew = function(){
    $scope.adding = true;
    // var seed = new Seed();
    var time = new Date();
    $scope.seeds.unshift({'id': time.toString(), 'title': $rootScope.new, 'last': undefined, 'createdAt': time});
    newSeeds.unshift({'id': time.toString(), 'title': $rootScope.new, 'last': undefined, 'createdAt': time});
    $scope.$apply();
    localSave();
    // seed.set('title', $rootScope.new);
    // seed.save({
    //   success: function(result){
    //     $scope.seeds.unshift({'id': result.id, 'title': result.get('title'), 'last': result.get('last'), 'createdAt': result.createdAt});
    //     $rootScope.new = '';
    //     $scope.adding = false;
    //     $scope.$apply();
    //     // console.log(result);
    //     // console.log($scope.seeds);
    //   },
    //   error: function(result, error){
    //     $scope.adding = false;
    //     console.log(error.message);
    //   }
    // })
    // console.log('adding:' + $rootScope.new);
    if($rootScope.currentUser){
      $scope.refresh();
    }
    $rootScope.new = '';
    $scope.adding = false;
  }

  $scope.didIt = function(formattedseed){
    var now = new Date();
    // var record = new Record();
    // var seed = new Seed;
    // seed.id = formattedseed.id;
    // record.set('seed', seed.id);
    // record.save();
    // seed.last = now;
    formattedseed.last = now;
    newRecords.push({'seed': formattedseed.id, 'date': now});
    records.push({'seed': formattedseed.id, 'date': now});
    localSave();
    // newUpdates.push({'seed': seed.id, 'date': now});
    $scope.$apply();
    if($rootScope.currentUser){
      $scope.refresh();
    }
    // seed.save({
    //   success: function(result){
    //     formattedseed.last = result.get('last');
    //     $scope.$apply();
    //   },
    //   error: function(result, error){
    //     console.log(error.message);
    //   }
    // })
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

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

  //for displaying loading animation
  $scope.loading = false;

  var Seed = Parse.Object.extend('Seed');
  // var Record = Parse.Object.extend('Record');
  var seedQuery = new Parse.Query(Seed);
  $scope.scrolling = false;
  // $scope.seeds = [];

  //existing seeds saved in localstorage
  if(window.localStorage['seeds']){
    $scope.seeds = JSON.parse(window.localStorage['seeds']);
  } else {
    $scope.seeds = [];
  }
  // if(window.localStorage['records']){
  //   var records = JSON.parse(window.localStorage['records']);
  // } else {
  //   var records = [];
  // }


  //a list of seeds that need to be uploaded
  if(window.localStorage['newSeeds']){
    var newSeeds = JSON.parse(window.localStorage['newSeeds']);
  } else {
    var newSeeds = [];
  }

  //updated seeds that need to be uploaded, only needed when user has synced before.
  if($rootScope.currentUser){
    if(window.localStorage['updatedSeeds']){
      var updatedSeeds = JSON.parse(window.localStorage['updatedSeeds']);
    } else {
      var updatedSeeds = {};
    }
  }
  
  // if(window.localStorage['newRecords']){
  //   var newRecords = JSON.parse(window.localStorage['newRecords']);
  // } else {
  //   var newRecords = [];
  // }
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
      // $scope.$apply();
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
  var exists = true;
  $scope.checkaccount = function(){
    if($scope.data.email){
      var userquery = new Parse.Query('User');
      userquery.equalTo('username', $scope.data.email);
      userquery.find({
        success: function(result){
          exists = true;
        },
        error: function(result, error){
          exists = false;
        }
      })
    }
  }
  // An elaborate, custom popup
  var myPopup = $ionicPopup.show({
    template: '<label class="item item-input" style="margin-bottom: 5px"><input type="email" placeholder="Email" ng-model="data.email" ng-blur="checkaccount()"></label><label class="item item-input"><input type="password" placeholder="Password" ng-model="data.pwd"></label>',
    title: 'Log in to sync',
    scope: $scope,
    buttons: [
      { text: 'Later' },
      {
        text: '<b>Login</b>',
        type: 'button-calm',
        onTap: function(e) {
          if (!$scope.data.email || !$scope.data.pwd) {
            //don't allow the user to close unless he enters wifi password
            e.preventDefault();
          } else {
            if(!exists){
              user.set('username', $scope.data.email);
              user.set('email', $scope.data.email);
              user.set('password', $scope.data.pwd);
              user.signUp(null, {
                success: function(user){
                  $rootScope.currentUser = user;
                  $scope.refresh();
                }, error: function(user, error){
                  alert("Error: "+ error.code + " " + error.message);
                }
              })
            } else {
              Parse.User.logIn($scope.data.email, $scope.data.pwd, {
                success: function(user){
                  $rootScope.currentUser = user;
                  $scope.refresh();
                }, error: function(user, error){
                  alert(error.message);
                }
              })
            }
          }
        }
      }
    ]
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
    // var uploaded_r = 0;
    var uploaded_u = 0;
    // if(newSeeds.length >= 1 || newRecords.length >= 1){
      //upload new seeds
    // console.log('new: '+ newSeeds.length + ', updated: '+updatedSeeds);
    if(newSeeds.length >= 1 || Object.keys(updatedSeeds).length >= 1){
      console.log('new or updated seeds' + newSeeds.length + ',' + Object.keys(updatedSeeds).length);
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
        n_seed.set('count', newSeeds[i].count);
        n_seed.save({
          success: function(result){
            uploaded_s++;
            console.log(uploaded_s + '/' + newSeeds.length + ',' +uploaded_u + '/' + Object.keys(updatedSeeds).length);
            if (uploaded_s >= newSeeds.length && uploaded_u >= Object.keys(updatedSeeds).length){
              newSeeds = [];
              updatedSeeds = {};
              localSave();
              download();
            }
          }
        });
      }
      for(var k in updatedSeeds){
        if(typeof updatedSeeds[k][0] == 'string'){
          var last = new Date(Date.parse(updatedSeeds[k][0]));
          // console.log(typeof last);
        } else {
          var last = updatedSeeds[k][0];
        }
        var u_seed = new Seed();
        u_seed.id = k;
        u_seed.fetch({
          success: function(result){
            if(u_seed.get('last') == undefined || u_seed.get('last') < last){
              u_seed.set('last', last);
              u_seed.set('count', updatedSeeds[k][1]);
              console.log('updating last');
              u_seed.save({
                success: function(result){
                  uploaded_u++;
                  console.log(uploaded_s + '/' + newSeeds.length + ',' +uploaded_u + '/' + Object.keys(updatedSeeds).length);
                  // if all the new seeds and updated seeds are uploaded, clear the local variables
                  if (uploaded_s >= newSeeds.length && uploaded_u >= Object.keys(updatedSeeds).length){
                    newSeeds = [];
                    updatedSeeds = {};
                    localSave();
                    download();
                  }
                }, 
                error: function(result, error){
                  console.log(error.message);
                }
              });
            }
          }, 
          error: function(result, error){
            console.log(error.message);
          }
        });
      }
      //upload new records and update seeds' lasts, need to go before seeds cus it uses legacy ids
      // for (var j in newRecords){
      //   console.log(newRecords.length + ' new records');
      //   if(typeof newRecords[j].date == 'string'){
      //     var last = Date.parse(newRecords[j].date);
      //   } else {
      //     var last = newRecords[j].date;
      //   }
      //   var n_update = new Seed();
      //   var n_record = new Record();
      //   //upload new records
      //   n_record.set('seed', newRecords[j].seed);
      //   // n_record.set('date', last);
      //   n_record.save({
      //     success: function(result){
      //       uploaded_r++;
      //       if (uploaded_r >= newRecords.length){
      //         newRecords = [];
      //         localSave();
      //       }
      //     },
      //     error: function(result, error){
      //       console.log(error.message);
      //     }
      //   })
      //   //update last time of existing seeds if server side is newer, doesn't work if not uploaded seed
      //   var idQuery = new Parse.Query('Seed');
      //   var legacyQuery = new Parse.Query('Seed');
      //   legacyQuery.equalTo('legacy_id', newRecords[j].seed);
      //   idQuery.get(newRecords[j].seed, {
      //     success: function(result){
      //       console.log(result.get('last'));
      //       n_update = result;
      //       if(n_update.get('last') == undefined || n_update.get('last') < last){
      //         n_update.set('last', last);
      //         n_update.save({
      //           success: function(success){
      //             download();
      //           }
      //         }); 
      //       }
      //     },
      //     error: function(result, error){
      //       console.log(error.message);
      //       legacyQuery.find({
      //         success: function(result){
      //           n_update = result[0];
      //         },
      //         error: function(result, error){
      //           console.log(error.message);
      //         }
      //       })
      //     }
      //   });
      // }
    } else {
      download();
    }
  }
  //get seeds from Parse
  function download(){
    console.log('downloading');
    // console.log('download');
    seedQuery.equalTo('user', $rootScope.currentUser);
    seedQuery.find({
      success: function(result){
        var tempseeds = [];
        for (var i in result){
          tempseeds.push({'id': result[i].id, 'title': result[i].get('title'), 'last': result[i].get('last'), 'createdAt': result[i].get('createdTime'), 'count': result[i].get('count') || 0});
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


  //upload seeds and updates
  $scope.refresh = function(){
    console.log('refreshing');
    if($rootScope.currentUser){
      console.log('loggedin');
      $scope.loading = true;
      upload();
    } else {
      console.log('not loggedin');
      //the first auto sync fail doesn't popup login
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

//calculate the difference between now and then for date or strings of date
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
    // window.localStorage['records'] = JSON.stringify(records);
    window.localStorage['newSeeds'] = JSON.stringify(newSeeds);
    window.localStorage['updatedSeeds'] = JSON.stringify(updatedSeeds);
    // window.localStorage['newRecords'] = JSON.stringify(newRecords);
  }

//add a new seed with created at time, then save locally for the next sync
  $scope.addNew = function(){
    $scope.adding = true;
    // var seed = new Seed();
    var time = new Date();
    $scope.seeds.unshift({'id': 'temp' + time.toString(), 'title': $rootScope.new, 'last': undefined, 'createdAt': time, 'count': 0});
    newSeeds.unshift({'id': 'temp' + time.toString(), 'title': $rootScope.new, 'last': undefined, 'createdAt': time, 'count': 0});
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
    // seed.fetch({
    //   success: function(result){
    //     if(seed.get('last') == undefined || n_update.get('last') < now){
    //       seed.set('last', now);
    //       seed.save();
    //     }
    //   }
    // });
    // record.set('seed', seed.id);
    // record.save();
    // seed.last = now;
    formattedseed.last = now;
    formattedseed.count = formattedseed.count + 1 || 1;
    //add to updated list if the seed is already synced
    // console.log(formattedseed.id.slice(0,4));
    if(formattedseed.id.slice(0,4) != 'temp'){
      updatedSeeds[formattedseed.id] = [now, formattedseed.count];
      // console.log(updatedSeeds);
    }
    
    // newRecords.push({'seed': formattedseed.id, 'date': now});
    // records.push({'seed': formattedseed.id, 'date': now});
    localSave();
    // newUpdates.push({'seed': seed.id, 'date': now});
    // $scope.$apply();
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
    //do not show input bar when jumping by pressing index
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

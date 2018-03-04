require('./bootstrap');

Vue.component('item', require('./components/profile/Item.vue'));
Vue.component('jewel', require('./components/profile/Jewel.vue'));
//GRID
Vue.component('list-characters', require('./components/profile/ListCharacters.vue'));
//LIST
Vue.component('list-characters-rank', require('./components/home/ListCharacters.vue'));

Vue.component('profile-nav', require('./components/profile/ProfileNavigation.vue'));
Vue.component('character-stats', require('./components/profile/CharacterStats.vue'));
Vue.component('list-skills', require('./components/profile/ListSkills.vue'));
Vue.component('item-info', require('./components/profile/ItemInfo.vue'));
Vue.component('loader', require('./components/Loader.vue'));
Vue.component('bubble', require('./components/profile/Bubble.vue'));
Vue.component('bandits', require('./components/profile/Bandits.vue'));
Vue.component('pob-code', require('./components/profile/PobCode.vue'));

Vue.component('modal-twitch', require('./components/home/ModalTwitch.vue'));
Vue.component('modal-snapshots', require('./components/profile/ModalSnapshots.vue'));
Vue.component('drop-down', require('./components/home/DropDown.vue'));

import {poeHelpers} from './helpers/poeHelpers.js';
var favStore = require('./helpers/FavStore.js');
var profileStore = require('./helpers/profileStore.js');


new Vue({
    el: '#app',
    data: {
        dbAcc: window.PHP.dbAcc,
        build: window.PHP.build,
        isBuild: false,
        isModalVisible: false,
        isSnapshotsVisible: false,
        accountCharacters: '',
        searchAcc: '',
        account: '',
        character: '',
        items: '',
        treeData: null,
        showItem: false,
        showStat: false,
        showBubbles: false,
        stickedStat: '',
        hoveredStat: '',
        hoveredItem: '',
        modTitle: '',
        moreInfoStats: [
            {name:'Life', total:'', aura: '', tooltip:'', indexes: {flat: 8, percent: 9}},
            {name:'Mana', total:'',  aura: '', tooltip:'', indexes: {flat: 10, percent: 11}},
            {name:'Energy Shield', total:'', aura: '', tooltip:'', indexes: {flat: 12, percent: 13}},
            {name:'Armour', total:'', aura: '', tooltip:'', indexes: {flat: 4, percent: 5}},
            {name:'Evasion', total:'', aura: '', tooltip:'', indexes: {flat: 6, percent: 7}},
        ],
        moreInfoTabActive: true,
        skillTreeActive: false,
        jewelsTabActive: false,
        classIds: [
            {id: 0, name: 'Scion'},
            {id: 1, name: 'Marauder'},
            {id: 2, name: 'Ranger'},
            {id: 3, name: 'Witch'},
            {id: 4, name: 'Duelist'},
            {id: 5, name: 'Templar'},
            {id: 6, name: 'Shadow'},
        ],
        loadingItems:false,
        showBandits:false,
        favStore: favStore,
        profileStore: profileStore,
        alertMsg: '',
        showAlert: false,
        skillTreeUrl: '',
        showOffHand: false,
        skillTreeReseted: false,
        rankArchives: window.PHP.rankArchives,
        original_char: '',
    },



    mounted: function () {
        $('.po-bandits-link').popover({
           trigger: 'click',
           html: true,
           title: $('.po-title').html(),
           content: $('#popper-content-bandits'),
           container: 'body',
           placement: 'top'
        });
    },

    computed: {

        characterRank: function(){
            var rank = ''
            var self = this;
            this.dbAcc.ladder_chars.forEach(c => {
                if (c.name === self.character.name) {
                    rank = '(Rank: ' + c.rank + ')';
                    if (c.league !== self.character.league.toLowerCase()) {
                        rank = '(Rank: ' + c.rank + ' in ' + _.upperFirst(c.league) + ')';
                    }
                }
            });
            return rank;
        },

        stickedStatItems: function(){
            var tempArr = {};
            for (var key in this.hoveredStat.items) {
                if (this.hoveredStat.items[key].total > 0) {
                    tempArr[key] = this.hoveredStat.items[key];
                }
            }
            return tempArr;
        },

        flasks: function(){
            var addFlasks = 0;
            var tempFlasks = [];
            if(this.items.length === 0){
                for (var j = 0; j < 4; j++) {
                    tempFlasks.push({name:'null', x: j, inventoryId:"Flask", frameType: 666});
                }
                return tempFlasks;
            }
            //get all flasks
            this.items.forEach(function(item){
                if (item.inventoryId === 'Flask') {
                    tempFlasks.push(item);
                }
            });

            if (tempFlasks.length < 5) {
                addFlasks = 5 - tempFlasks.length;
            }

            for (var i = 0; i < addFlasks; i++) {
                tempFlasks.push({name:'null', x: '', inventoryId:"Flask", frameType: 666});
            }

            //add fake flask object for empty image
            var tempIndexes = []
            tempFlasks.forEach(function (flask, index) {
                if (flask.x === '') {
                    for (var i = 0; i < 4; i++) {
                        // if (!inArray(i, tempIndexes)) {
                        if (!_.includes(tempIndexes,i)) {
                            flask.x = i;
                            tempIndexes.push(i)
                            break;
                        }
                    }
                }
                tempIndexes.push(flask.x);
            });

            //reorder flasks postion to match ingame
            var flasks = [];
            tempFlasks.forEach(function(flask, index){
                flasks[flask.x] = flask;
            });
            return flasks;
        },

        itemJewels: function(){
            //add abyss jewels from items to itemJewels var
            if (this.items.length === 0) {
                return [];
            }
            var abyss = [];
            var itemsWithSockets = this.items.filter(function (item) {
                return item["socketedItems"] != undefined;
            });
            itemsWithSockets.forEach(item => {
                item['socketedItems'].forEach(element => {
                    if (element['properties'][0]['name'] === 'Abyss') {
                        abyss.push(element);
                    }
                });
            })

            return  abyss;
        },

        computedItems: function (){
            var tempItems = [];
            var addItems = 0;
            var skipTypes = ['Flask', 'Weapon2', 'Offhand2'];
            var itemTypes = ['Helm', 'Boots', 'Gloves', 'Weapon', 'Offhand', 'BodyArmour', 'Belt', 'Amulet', 'Ring', 'Ring2'];

            if (this.showOffHand) {
                itemTypes = ['Helm', 'Boots', 'Gloves', 'Weapon2', 'Offhand2', 'BodyArmour', 'Belt', 'Amulet', 'Ring', 'Ring2'];
                skipTypes = ['Flask', 'Weapon', 'Offhand'];
            }

            if(this.items.length === 0){
                for (var j = 0; j < itemTypes.length; j++) {
                    tempItems.push({name:'null', inventoryId: itemTypes[j], frameType: 666, socketedItems: []});
                }
                return tempItems;
            }

            tempItems = this.items.filter(function(item){
                return !_.includes(skipTypes,item.inventoryId);
                // return !inArray(item.inventoryId, skipTypes);
            });

            if (tempItems.length < 10) {
                addItems = 10 - tempItems.length;
            }

            for (var i = 0; i < addItems; i++) {
                tempItems.push({name:'null', inventoryId:"", frameType: 666, socketedItems: []});
            }

            tempItems.forEach(function(item){
                if (item.inventoryId === '') {
                    item.inventoryId = itemTypes[0];
                    itemTypes.splice(0, 1);
                } else {
                    for (var i = 0; i < itemTypes.length; i++) {
                        if (itemTypes[i] === item.inventoryId) {
                            itemTypes.splice(i, 1);
                        }
                    }
                }
            });


            return tempItems;
        }
    },

    created: function () {
        if(window.PHP.loadBuild){
            this.setupBuild();
            return;
        }
        this.setAccountData();
        this.getCharacterItems();
    },

    methods: {

        // build initialization
        setupBuild:function(){
            this.account = window.PHP.account;
            this.isBuild = true;
            this.accountCharacters = this.favStore.favBuilds;

            if(this.account==""){
                var build = _.last(this.favStore.favBuilds);
                location.replace((new poeHelpers).getBaseDomain() + '/build/' + build.buildId);
            }

            var build = window.PHP.build;
            //if build null snapshot removed from db
            if(build==null){
                this.character = this.favStore.getBuild(this.account.split('::')[1]);
                return;
            }

            if (this.favStore.isBuildPublic(this.account)){
                this.accountCharacters = [];
                this.character = build.item_data.character;
            }else{
                this.character = this.favStore.getBuild(build.hash);
            }
            this.original_char=build.original_char;
            this.items = build.item_data.items;
        },

        setAccountData: function () {
            this.account = window.PHP.account;


            if (window.PHP.chars === null) {
            } else {
                this.accountCharacters = window.PHP.chars;
            }

            if (window.PHP.char === '') {
                this.character = this.accountCharacters[0];
                return;
            }
            this.character = this.accountCharacters.filter(function(chars){
                return chars.name === window.PHP.char;
            })[0];
            this.original_char=this.account +"/"+this.character.name;
        },

        checkBuilds: function(){
            return this.accountCharacters.length > 0 || this.favStore.isBuildPublic(this.account);
        },

        calcReserved: function(reserved){
            var allStats = this.profileStore.getAllStats();
            if (allStats.defense[12].radiantFaith) {
                allStats.defense[12].fromRadiantFaith = Math.floor(reserved * 0.15);
                this.calcTotals();
            }
        },

        toggleStickStat: function(stat) {
            this.showStat = true;
            if (this.stickedStat.name == stat.name) {
              this.stickedStat = '';
              this.showStat = false;
              return;
            }
            this.stickedStat = stat;
            this.hoveredStat = stat;
        },

        goToAcc: function(acc) {
            window.location = "/profile/"+acc;
        },

        switchWeapons: function(){
            this.showOffHand = !this.showOffHand;
            this.stickedStat = '';
            this.showStat = false;
        },

        calcTotals: function(){
            this.showBubbles = true;
            var allStats = this.profileStore.getAllStats();
            if(allStats.length === 0){
                return;
            }

            var self = this;
            var stats=allStats;
            var tempAura;
            var auraVal;
            this.moreInfoStats.forEach(function(stat){
                var flat = 0,
                    percent = Math.round(stats.defense[stat.indexes.percent].total);
                // stat.total = Math.floor(Math.floor(Math.floor(flat * percent) / 100) + flat);
                stat.total = stats.defense[stat.indexes.percent].totalCalc;
                if (stat.name === 'Life' && flat > 1) {
                    flat = (40 * percent) / 100 + 40;
                    stat.aura = 'Bandits Oak: ' + Math.floor(stat.total + flat);
                }
                if (stat.name === 'Energy Shield') {
                    var fromRadiantFaith = Math.floor(allStats.defense[12].fromRadiantFaith * ((allStats.defense[13].total*0.01)+1));
                    stat.total += fromRadiantFaith;

                    tempAura = self.profileStore.findAura('Discipline');
                    if (tempAura) {
                        auraVal = self.withAuraEffectiveness(tempAura.val, stats)
                        flat = (auraVal * percent) / 100 + auraVal;
                        stat.aura = 'with Discipline ' + tempAura.lvl + ': ' + Math.floor(stat.total + flat);
                    }

                    var strTooltip='';
                    var es=stats.defense[stat.indexes.percent];
                    if (Math.round(es.sanctuaryVal) > 0) {
                        strTooltip = Math.round(es.sanctuaryVal) + ' Extra Energy Shield added after conversion from Sanctuary of Thought';
                    }
                    if (Math.round(es.chaylaVal) > 0) {
                        strTooltip = Math.round(es.chaylaVal) + ' Extra Energy Shield added after conversion from Presence of Chayula';
                    }

                    stat.tooltip=strTooltip;
                }
                if (stat.name === 'Evasion') {
                    tempAura = self.profileStore.findAura('Grace');
                    if (tempAura) {
                        auraVal = self.withAuraEffectiveness(tempAura.val, stats)
                        flat = (auraVal * percent) / 100 + auraVal;
                        stat.aura = 'with Grace ' + tempAura.lvl + ': ' + Math.floor(stat.total + flat);
                    }
                }
                if (stat.name === 'Armour') {
                    tempAura = self.profileStore.findAura('Determination');
                    if (tempAura) {
                        var totalWithAura =  stat.total + (stat.total*self.withAuraEffectiveness(tempAura.val, stats))/100;
                        stat.aura = 'with Determination ' + tempAura.lvl + ': ' + Math.floor(totalWithAura);
                    }
                }
            });
        },

        withAuraEffectiveness: function(val, stats){
            var tempStats = stats.defense.concat(stats.offense).concat(stats.misc);
            var effectiveness = 0;
            var  infusedShield = 0;
            tempStats.forEach(function(stat){
                if (stat.name === '% effect of Auras') {
                    effectiveness += stat.total;
                }
                if (stat.name === 'Energy Shield' && stat.note !== '') {
                    //infusedShield += 15;
                }
            });
            val = parseInt(val) + (val*parseInt(effectiveness))/100;
            val = parseInt(val) + (val*parseInt(infusedShield))/100;
            return val;
        },

        twoRolls: function(){
            if (Object.keys(this.stickedStatItems).length > 3) {
                return true;
            }
            return false;
        },

        withEllipsis: function(text,after){
            if(text.length<=after){
                return text;
            }
            return text.substring(0, after)+".."
        },

        toggleItemInfo: function(itemType){
            this.hoveredItem = '';
            this.showItem = !this.showItem;
            if(this.showItem){
                this.hoveredItem = this.getItem(itemType);
            }
        },

        getItem: function(type){
            var self = this;
            return this.items.filter(function(item){
                return item.inventoryId === type;
            })[0];
        },

        getCharacterClass: function(){
            var self = this;
            return this.classIds.filter(function(x) {
                return x.id === self.character.classId;
            })[0].name;
        },

        navMoreInfo: function (event) {
            switch (event.target.getAttribute("data-toggle")) {
                case 'more-info':
                    this.moreInfoTabActive = true;
                    this.skillTreeActive = false;
                    this.jewelsTabActive = false;
                    break;
                case 'jewels':
                    this.jewelsTabActive = true;
                    this.moreInfoTabActive = false;
                    this.skillTreeActive = false;
                    var self = this;
                    if(this.treeData!=null){
                        //console.log('jewels treeData in cache no request');
                    }else{
                        this.getTreeData(function(response){
                            self.treeData=response.data;
                        });
                    }
                    break;
                case 'skill-tree':
                    this.moreInfoTabActive = false;
                    this.jewelsTabActive = false;
                    this.skillTreeActive = true;
                    var self=this;
                    if(this.treeData!=null){
                        self.setTreeUrl();
                        return;
                    }else{
                        console.log("testSkill-tree");
                        this.getTreeData(function(response){
                            self.treeData=response.data;
                            self.setTreeUrl();
                        });
                    }
                    document.getElementById("navmoreinfo").scrollIntoView();
                    break;
            }

        },

        getTreeData: function (response){
            var self=this;
            axios.get("/character-window/get-passive-skills",
                {params:  {
                    accountName: this.account,
                    character: this.character.name,
                }}).then(response);
        },

        setTreeUrl: function(){
            var userStr="?accountName="+this.account+"&characterName="+this.character.name;
            var tempStr = "/passive-skill-tree/hash"+userStr;
            var url_hash = (new poeHelpers).getTreeUrl(
                this.character.classId,
                this.character.ascendancyClass,
                this.treeData.hashes
            );
            this.skillTreeUrl=tempStr.replace('hash',url_hash);
        },

        getCharacterItems: function () {
            //start loading bar for items and stats
            this.loadingItems=true;
            var formData = new FormData();
            formData.append('account', this.account);
            formData.append('character', this.character.name);
            axios.post('/api/char/items', formData).then((response) => {
                this.items = response.data;
                this.loadingItems=false;
            });
        },

    }
});

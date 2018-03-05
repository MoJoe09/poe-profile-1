<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use App\Http\Requests;
use App\PoB\PobXMLBuilder;

class ApiController extends CacheController
{
    public function getItems(Request $request)
    {
        if (!$request->has('account') && !$request->has('character')) {
            return;
        }
        $b = explode('::', $request->input('account'));
        if($b[0] == 'build'){
            return \App\Snapshot::where('hash','=',$b[1])->get()->item_data['items'];
        }
        $acc=$request->input('account');
        $char=$request->input('character');
        //getItemsCache() is from parant class CacheController
        return $this->getItemsCache($acc, $char);
    }

    public function getStats(Request $request)
    {
        if (!$request->has('account') && !$request->has('character')) {
            return;
        }
        $acc=$request->input('account');
        $char=$request->input('character');

        $b = explode('::', $acc);
        if ($b[0] == 'build') {
            $build=\App\Snapshot::where('hash','=',$b[1])->first();
            if(!$build){
                return [];
            }
            return $build->getStats();
        }
        //getStatsCache() is from parant class CacheController
        return $this->getStatsCache($acc, $char);
    }

    public function getFavsChars()
    {
        $favs=collect(explode(',', $_GET['accs']));
        $accs=\App\Account::with('streamer')->whereIn('name', $favs)->get();
        // $accs=\App\Account::with('streamer')->where('name','kas7erpoe', false)->get();
        //dd($accs->toJson());
        if (count($favs)==0) {
            return [];
        }
        // dd($favs);
        $newFavs = $favs->map(function ($favItem, $key) use ($accs) {
            $char=[
                'league'=>'',
                'name'=>'',
                'class'=>'',
                'level'=>'',
                'items_most_sockets'=>'',
                'account'=>[
                    'name'=>$favItem,
                ]
            ];

            //$item = $accs->where('name', $favItem, false)->first();
            $item = $accs->filter(function ($item) use ($favItem) {
                return strtolower($item['name']) == strtolower($favItem);
            })->first();

            if ($item) {
                if ($item->last_character_info) {
                    $char=$item->last_character_info;
                    $char['account']=$item;
                    // $char['twitch']=$item->streamer;
                }
            }
            return $char;
        });

        return $newFavs;
    }

    public function getLadder(Request $request)
    {
        $take = 30;
        if ($request->has('searchFilter')) {
            $respond = \App\LadderCharacter::with('account')
                ->where('league', '=', $request->input('leagueFilter'))
                ->whereHas('account', function ($query) use (&$request) {
                    $query->where('name', 'like', '%'.$request->input ('searchFilter').'%');
                })
                ->orWhere('name', 'like', '%'.$request->input ('searchFilter').'%')
                ->paginate($take);

            return $respond;
        }

        if ($request->has('classFilter') && $request->has('skillFilter')) {
            $respond = \App\LadderCharacter::with('account')
                                ->where('items_most_sockets', 'like', "%typeLine\":\"".$request->input('skillFilter')."\"%")
                                ->where('class', '=', $request->input('classFilter'))
                                ->where('league', '=', $request->input('leagueFilter'))->orderBy('rank', 'asc')
                                ->paginate($take);
            return $respond;
        }
        if ($request->has('classFilter')) {
            $respond = \App\LadderCharacter::with('account')
                ->where('class', '=', $request->input('classFilter'))
                ->where('league', '=', $request->input('leagueFilter'))->orderBy('rank', 'asc')
                ->paginate($take);
            return $respond;
        }


        if ($request->has('skillFilter')) {
            $respond = \App\LadderCharacter::with('account')
                        ->where('items_most_sockets', 'like', "%typeLine\":\"".$request->input('skillFilter')."\"%")
                        ->where('league', '=', $request->input('leagueFilter'))->orderBy('rank', 'asc')
                        ->paginate($take);
            return $respond;
        }

        if ($request->has('leagueFilter')) {
            $respond = \App\LadderCharacter::with('account')->where('league', '=', $request->input('leagueFilter'))
                        ->orderBy('rank', 'asc')->paginate($take);
            return $respond;
        }

        $currentLeagues = explode(',', env('POE_LEAGUES'));
        $respond = \App\LadderCharacter::with('account')->where('league', '=', $currentLeagues[0])->orderBy('rank', 'asc')->paginate($take);
        return $respond;
    }

    public function getTwitchChars()
    {
        $online = \App\TwitchStreamer::with('account')->where('online', true)->orderBy('viewers', 'desc')->get();
        $online = $online->map(function ($streamerItem, $key) {
            $char=[];
            if ($streamerItem->account->last_character_info) {
                $char=$streamerItem->account->last_character_info;
            } else {
                $char=[
                    'league'=>'',
                    'name'=>'',
                    'class'=>'',
                    'level'=>'',
                    'items_most_sockets'=>'',
                ];
            }
            $char['account']=[
                'name'=>$streamerItem->account->name,
            ];
            $char['twitch']=$streamerItem;
            return $char;
        });

        return $online;
    }

    public function getXML(Request $request)
    {
        $acc = $request->input('account');
        $char = $request->input('char');

        $itemsData = $this->getItemsCache($acc, $char, true);
        $treeJson = $this->getTreeCache($acc, $char);
        $pob = new PobXMLBuilder($itemsData, $treeJson);

        // show XML ---->
        // Header('Content-type: text/xml');
        // print($pob->getXML());
        // die();
        return $pob->encodedXML();
    }

    public function getSnapshots($acc, $char)
    {
        $original_char = $original_char = $acc .'/'. $char;
        $snapshots = \App\Snapshot::where('original_char', '=', $original_char)->orderBy('created_at', 'desc')->take(25)->get();
        return $snapshots;
    }

    public function getBuild($hash)
    {
        $build = \App\Snapshot::where('hash', '=', $hash)->first();
        return $build;
    }

    public function saveBuild(Request $request)
    {
        $acc=$request->input('account');
        $char=$request->input('char');

        //getItemsCache() true to get the whole respons
        $itemData = $this->getItemsCache($acc, $char, true);
        $itemsNoFlasks = array_filter($itemData['items'], function ($item){
            return $item['inventoryId']!="Flask";
        });
        $itemsNoFlasks=json_encode($itemsNoFlasks);
        $itemData = json_encode($itemData);
        $treeData = $this->getTreeCache($acc, $char);
        $treeData = json_encode($treeData);

        $hash = md5($treeData.'/'.$itemsNoFlasks);
        $snapshot = \App\Snapshot::where('hash', '=', $hash)->first();
        if(!$snapshot){
            $version = config('app.poe_version');
            $original_char = $acc .'/'. $char;
            $snapshot = \App\Snapshot::create([
                'hash' => $hash,
                'tree_data' => $treeData,
                'item_data' => $itemData,
                'original_char' => $original_char,
                'poe_version' => $version
            ]);
            $snapshot->original_level = $snapshot->item_data['character']['level'];
            $snapshot->save();
        }

        $favStore = $snapshot->item_data['character'];
        $favStore['league'] = 'localBuild';
        $favStore['buildId'] = $snapshot->hash;
        return $favStore;
    }
}

<?php

define("DEV_ENV",$_SERVER["HTTP_HOST"] == 'asr.localhost'); // for local usage

if (DEV_ENV) {
   error_reporting(E_ALL); ini_set("display_errors","on");
} else {
   error_reporting(0);
}

define("SLASH", DIRECTORY_SEPARATOR);
define("BASEPATH", realpath(dirname(__FILE__) . '/..'));
define("AUDIOPATH", realpath(BASEPATH . '/audio'));
define("SMARTLAMPPATH", realpath(BASEPATH . '/smartlamp'));
if (DEV_ENV) {
   define("FFMPEG", realpath(BASEPATH . '/ffmpeg-4.3.1-2020-11-19-essentials_build/bin') . SLASH . 'ffmpeg.exe');
   define("SMARTLAMP", SMARTLAMPPATH . SLASH . "recikts_win64.exe");
} else {
   define("FFMPEG", realpath('/usr/bin/') . SLASH . 'ffmpeg');
   //define("SMARTLAMP", SMARTLAMPPATH . SLASH . "recikts_lin64");
   define("SMARTLAMP", SMARTLAMPPATH . SLASH . "recognizer.sh");
}

//print_r(array(SLASH,BASEPATH,AUDIOPATH,FFMPEG,SMARTLAMP));

$dt = explode(" ", microtime());
$dt = explode("-", date("Y-m-d-His").'-'.base_convert(round(100000*$dt[0])%46656,10,36));

$af = array();
$af["dir"] = AUDIOPATH . SLASH . $dt[0] . SLASH . $dt[1];
if (!is_dir($af["dir"])) {
   if (!mkdir($af["dir"], 0770, true)) {
      die(json_encode(array("error" => "Failed to create directory (".$af["dir"].")")));
   }
}
$af["name"] = $dt[0] . $dt[1] . $dt[2] . '-' . $dt[3] . '-' . $dt[4];
$af["fullnoext"] = $af["dir"] . SLASH . $af["name"];
//print_r(array($dt,$afdir,$afname));
//print_r($_FILES);

// save file, if uploaded
if (isset($_FILES['recfile']) and !$_FILES['recfile']['error']) {
   $t = explode("/", $_FILES['recfile']['type']);
   $af["ext"] = $t[1];
   $af["fullext"] = $af["fullnoext"] . "." . $af["ext"];
   $af["fullwav"] = $af["fullnoext"] . ".wav";
   if (!file_put_contents($af["fullext"], file_get_contents($_FILES['recfile']['tmp_name']))) {
      die(json_encode(array("error" => "Failed saving file", "file" => $_FILES['recfile'], "target" => $af["fullext"])));
   }
} else {
   die(json_encode(array("error" => "File upload failed")));
}

// convert file to correct wav format
/*
use: -ar 16k [-ac 1] -ocl mono -sample_fmt s16 [-ab 256k] -bitexact
maybe: -acodec pcm_s16le
*/

if (file_exists($af["fullext"])) {
   $output=array();
   $retval=null;
   $cmd = FFMPEG . " -i " . $af["fullext"] . " -ar 16k -ocl mono -sample_fmt s16 -bitexact " . $af["fullwav"];
   exec($cmd, $output, $retval);
   if ($retval == 0) {
      unlink($af["fullext"]);
   } else {
      die(json_encode(array("error" => "Failed to convert recorded file")));
   }
} else {
   die(json_encode(array("error" => "Recorded file not found for conversion")));
}

// recognize wav file
if (file_exists($af["fullwav"])) {
   $output=array();
   $retval=null;
   // $cmd = SMARTLAMP . " " . SMARTLAMPPATH . SLASH . "hsb.cfg " . $af["fullwav"];
   $cmd = SMARTLAMP . " " . $af["fullwav"];
   exec($cmd, $output, $retval);
   echo json_encode(array("error" => $retval, "asr" => $output, "file" => $af["name"]));
} else {
   die(json_encode(array("error" => "Converted file not found for recognition")));
}

?>
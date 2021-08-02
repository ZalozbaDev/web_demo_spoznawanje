<?php

define("DEV_ENV",$_SERVER["HTTP_HOST"] == 'asr.localhost'); // for local usage

if (DEV_ENV) {
   error_reporting(E_ALL); ini_set("display_errors","on");
} else {
   error_reporting(0);
}

define("SLASH", DIRECTORY_SEPARATOR);
define("ROOTPATH", realpath(dirname(__FILE__)));

?><!DOCTYPE html>
<html lang="hsb">

<head>
	<meta charset="utf-8">
	<meta name="viewport" content="width=device-width, initial-scale=1.0">
	<title>Serbska lampa</title>
	<style><?php readfile(ROOTPATH . SLASH . "css" . SLASH . "styles.css") ?></style>
</head>

<body>

<div class="wrapper">
	<h1 class="hide-when-recording">Lampa zrozumi serbsce!</h1>
	<p class="asr-output hide-when-recording">Přikłady:<br>Lampa, zaswěć so!<br>Swěca, ćěmnišo prošu!<br>Ćopłoběłu swěcu!</p>
	<div class="button1"><p class="lampa-status hide-when-recording"></p><canvas class="visualizer" height="67px"></canvas><div class="button2"><button id="record" onfocus="this.blur()">Praj lampje něšto …</button></div><p class="imagelicense">Icon by <a href="https://icons8.com">Icons8</a></p></div>
</div>

<script type="text/javascript">
<?php
foreach (array("jquery-3.5.1.min.js","jquery.color-2.1.2.min.js","md5.min.js","script.js") as $script) {
   readfile(ROOTPATH . SLASH . "js" . SLASH . $script);
   echo "\n\n\n";
} ?>
</script>
</body>
</html>

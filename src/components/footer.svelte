<script>
	import Fa from 'svelte-fa/src/fa.svelte';
	import {
		faTwitter,
		faYoutube,
		faFacebook,
		faInstagram
	} from '@fortawesome/free-brands-svg-icons';
</script>

<div class="w-full flex text-white bg-teal-500 flex-wrap">
	<div class="text-center p-5 grow shrink basis-1/2 md:basis-1/3">
		<h2 class="text-xl"><b>CONTACT</b></h2>
		<br />
		<h5>Email:<br />contact@whsrobotics.org</h5>
	</div>
	<div class="text-center p-5 grow shrink basis-1/2 md:basis-1/3">
		<h2 class="text-xl"><b>LOCATION</b></h2>
		<br />
		<h5>Westwood High School</h5>
		<h5>200 Nahatan Street #A160</h5>
		<h5>Westwood, MA 02090</h5>
	</div>
	<div class="text-center p-5 grow shrink basis-1/2 md:basis-1/3">
		<h2 class="text-xl"><b>STAY CONNECTED</b></h2>
		<br />
		<span class="flex gap-3 justify-center text-3xl cursor-pointer wrap basis-1/2 md:basis-1/3">
			<a
				href="https://twitter.com/WWRobotics1757"
				class="rounded-full bg-stone-700 hover:bg-stone-900 p-2 transition-colors"
			>
				<Fa icon={faTwitter} />
			</a>
			<a
				href="https://youtube.com/channel/UCIBET5BFj97t2WCr-tzr1VQ"
				class="rounded-full bg-stone-700 hover:bg-stone-900 p-2 transition-colors"
			>
				<Fa icon={faYoutube} />
			</a>
			<a
				href="https://www.instagram.com/wwrobotics1757"
				class="rounded-full bg-stone-700 hover:bg-stone-900 p-2 transition-colors"
			>
				<Fa icon={faInstagram} />
			</a>
			<a
				href="https://www.facebook.com/WWRobotics1757"
				class="rounded-full bg-stone-700 hover:bg-stone-900 p-2 transition-colors"
			>
				<Fa icon={faFacebook} />
			</a>
		</span>
	</div>
</div>
<div class="w-full text-white bg-stone-600 text-center p-7">
	Created and © 2020 by Westwood Robotics. All Rights Reserved.
</div>

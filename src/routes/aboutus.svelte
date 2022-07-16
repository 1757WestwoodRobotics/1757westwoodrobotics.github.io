<script>
	import Navbar from '../components/navbar.svelte';
	import Footer from '../components/footer.svelte';
</script>

<svelte:head>
	<title>About Us</title>
</svelte:head>

<Navbar />

<div
	class="max-w-full bg-[#115724] h-screen min-h-5 align-center bg-[url('/img/team_bg.jpg')] bg-center bg-cover bg-blend-multiply text-white text-center flex items-center justify-center"
>
	<div class="flex mx-4">
		<span class="shrink basis-1/3 flex hidden sm:block"> <img src="/favicon.png" /></span>
		<div class="text-center basis-auto sm:basis-2/3">
			<h2 class="text-5xl"><i><b>THIS</b></i> is 1757</h2>
			<br />
			<h6>
				Founded in 2006, we are a team of students and mentors from Westwood High School who are
				passionate about robotics. Skillful mentors work side-by-side with students to help foster
				the next generation of scientists, engineers, software developers, and business
				entrepreneurs.
			</h6>
		</div>
	</div>
</div>
<div class="max-w-full h-[70vh] bg-[url('/img/robot_pic.png')] min-h-5 bg-center bg-cover">
	<div
		class="text-white flex items-center justify-center text-center align-center h-full text-lg backdrop-blur-sm w-full"
	>
		<div class="flex items-center justify-around align-center px-4 gap-4">
			<p class="basis-1 grow">
				Affiliated with the Westwood High School as a club, FRC Team 1757 looks to give back to the
				community by introducing young students to robot design, programming, and other STEAM
				skills.
			</p>
			<p class="basis-1 grow">
				We participate in the FIRST Robotics Competition. <i>FIRST</i>, “For Inspiration and
				Recognition of Science and Technology”, is a foundation whose mission is to inspire young
				people to become science and technology leaders by engaging them in exciting mentor-based
				programs that build science, engineering, and technology skills.
			</p>
		</div>
	</div>
</div>
<div
	class="max-w-full h-[70vh] bg-blend-multiply bg-slate-300 bg-[url('/img/coolio.png')] min-h-5 bg-center bg-cover"
>
	<div
		class="h-full w-full flex items-center justify-center align-center backdrop-blur-sm text-white text-center px-6 gap-7"
	>
		<span class="basis-2/3">
			<h4 class="text-3xl">What if FRC?</h4>
			<p>
				<i>FIRST</i> Robotics Competition (FRC) is an international high school robotics competition.
				Each year teams obtain new game details in the beginning of January; they are given six weeks
				to construct and test their robot that can operate both autonomously and remotely.
			</p>
		</span>
		<span
			class="basis-1/3 aspect-square p-2 rounded bg-white flex align-center items-center justify-center"
		>
			<img src="/img/frc_logo.jpg" />
		</span>
	</div>
</div>
<div class="max-w-full bg-[url('/img/dcmp_team.jpg')] min-h-5 bg-center bg-cover">
	<span
		class="h-full w-full flex backdrop-blur text-white flex align-center justify-center items-center flex-col gap-4 py-10"
	>
		<h2 class="text-3xl"><b>Meet the team</b></h2>
		<h3 class="text-xl">E-Board</h3>
		<div class="flex justify-around text-center flex-wrap gap-5 mx-10 w-full max-w-screen-sm">
			<div class="flex justify-center align-center items-center flex-col">
				<img
					src="/img/team/charley.jpg"
					class="rounded-full aspect-square ring-4 w-32 ring-red-800 mb-5"
				/>
				<b>Charley Marsland</b>
				Captain
			</div>
			<div class="flex justify-center align-center items-center flex-col">
				<img src="/img/team/luke.png" class="rounded-full aspect-square ring-4 w-32 mb-5" />
				<b>Luke Maxwell</b>
				Vice Captain<br />Technical Lead
			</div>
			<div class="flex justify-center align-center items-center flex-col">
				<img
					src="/img/team/landon.jpg"
					class="rounded-full aspect-square ring-4 w-32 mb-5 rotate-[270deg] ring-green-800"
				/>
				<b>Landon Bayer</b>
				Business Lead
			</div>
			<div class="flex justify-center align-center items-center flex-col">
				<img
					src="/img/team/sean.jpg"
					class="rounded-full aspect-square ring-4 w-32 mb-5 rotate-[30deg] ring-orange-400"
				/>
				<b>Sean Tao</b>
				Secretary
			</div>
		</div>
		<br />
		<h3 class="text-xl">Mentors</h3>
		<div class="flex justify-around text-center flex-wrap gap-5 mx-10 w-full max-w-screen-sm">
			<div class="flex justify-center align-center items-center flex-col">
				<img
					src="/img/team/dwight.png"
					class="rounded-full aspect-square ring-4 w-32 rotate-[19deg] ring-emerald-600 mb-5"
				/>
				<b>Dwight Meglan</b>
				Lead Mentor
			</div>
			<div class="flex justify-center align-center items-center flex-col">
				<img
					src="/img/team/chris.png"
					class="rounded-full aspect-square ring-4 w-32 ring-cyan-600 mb-5"
				/>
				<b>Chris Aloisio</b>
				Programming Mentor<br />Cad Mentor
			</div>
			<div class="flex justify-center align-center items-center flex-col">
				<img
					src="/img/team/steven.png"
					class="rounded-full aspect-square ring-4 w-32 ring-rose-800 mb-5"
				/>
				<b>Steven Harrington</b>
				Mechanical Mentor<br />Business Mentor
			</div>
		</div>
		<br />
		<h3 class="text-xl">Other Roles</h3>
		<div class="flex justify-around text-center flex-wrap gap-5 mx-10 w-full max-w-screen-sm">
			<div class="flex justify-center align-center items-center flex-col">
				<img
					src="/img/team/ivan.jpg"
					class="rounded-full aspect-square ring-4 w-32 rotate-6 ring-fuchsia-800 mb-5"
				/>
				<b>Ivan Cai</b>
				Programming Lead
			</div>
			<div class="flex justify-center align-center items-center flex-col">
				<img
					src="/img/team/jeff.jpg"
					class="rounded-full aspect-square ring-4 w-32 rotate-6 ring-cyan-800 mb-5"
				/>
				<b>Jeffery Pan</b>
				Treasurer
			</div>
			<div class="flex justify-center align-center items-center flex-col">
				<img
					src="/img/team/rachel.jpg"
					class="rounded-full aspect-square ring-4 w-32 rotate-6 ring-pink-800 mb-5"
				/>
				<b>Rachel Qu</b>
				Media Manager
			</div>
		</div>
	</span>
</div>
<Footer />

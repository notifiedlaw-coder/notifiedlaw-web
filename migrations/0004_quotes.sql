CREATE TABLE `quote` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`text` text NOT NULL,
	`author` text NOT NULL,
	`source` text,
	`active` integer DEFAULT true NOT NULL,
	`created_at` integer NOT NULL
);

--> statement-breakpoint
INSERT INTO `quote` (`text`, `author`, `source`, `active`, `created_at`) VALUES
	('The life of the law has not been logic; it has been experience.', 'Oliver Wendell Holmes Jr.', 'The Common Law (1881)', 1, 1761600000000),
	('If the Government becomes a lawbreaker, it breeds contempt for law; it invites every man to become a law unto himself; it invites anarchy.', 'Louis D. Brandeis', 'Olmstead v. United States (1928), dissent', 1, 1761600000000),
	('The remedy to be applied is more speech, not enforced silence.', 'Louis D. Brandeis', 'Whitney v. California (1927), concurrence', 1, 1761600000000),
	('Justice should not only be done, but should manifestly and undoubtedly be seen to be done.', 'Lord Hewart CJ', 'R v Sussex Justices, ex parte McCarthy (1924)', 1, 1761600000000),
	('It is better that ten guilty persons escape than that one innocent suffer.', 'William Blackstone', 'Commentaries on the Laws of England', 1, 1761600000000),
	('Injustice anywhere is a threat to justice everywhere.', 'Martin Luther King Jr.', 'Letter from Birmingham Jail (1963)', 1, 1761600000000),
	('One has a moral responsibility to disobey unjust laws.', 'Martin Luther King Jr.', 'Letter from Birmingham Jail (1963)', 1, 1761600000000),
	('The welfare of the people shall be the supreme law.', 'Cicero', 'De Legibus', 1, 1761600000000),
	('Justice is the constant and perpetual will to render to every man his due.', 'Justinian', 'Institutes', 1, 1761600000000),
	('In England, amid the clash of arms, the laws are not silent. They may be changed, but they speak the same language in war as in peace.', 'Lord Atkin', 'Liversidge v Anderson (1942), dissent', 1, 1761600000000),
	('Be you ever so high, the law is above you.', 'Lord Denning', 'Gouriet v Union of Post Office Workers (1977)', 1, 1761600000000),
	('We are not final because we are infallible, but we are infallible only because we are final.', 'Robert H. Jackson', 'Brown v. Allen (1953)', 1, 1761600000000),
	('Wherever law ends, tyranny begins.', 'John Locke', 'Second Treatise of Government (1689)', 1, 1761600000000),
	('Judges ought to remember that their office is jus dicere, and not jus dare; to interpret law, and not to make law, or give law.', 'Francis Bacon', 'Of Judicature (1625)', 1, 1761600000000),
	('The history of liberty has largely been the history of observance of procedural safeguards.', 'Felix Frankfurter', 'McNabb v. United States (1943)', 1, 1761600000000),
	('Justice, though due to the accused, is due to the accuser also.', 'Benjamin N. Cardozo', 'Snyder v. Massachusetts (1934)', 1, 1761600000000),
	('Let justice be done, though the heavens fall.', 'Lord Mansfield', 'R v Wilkes (1770)', 1, 1761600000000),
	('I have cherished the ideal of a democratic and free society in which all persons live together in harmony and with equal opportunities.', 'Nelson Mandela', 'Statement from the dock, Rivonia Trial (1964)', 1, 1761600000000),
	('The law is reason, free from passion.', 'Aristotle', 'Politics', 1, 1761600000000),
	('Fight for the things that you care about, but do it in a way that will lead others to join you.', 'Ruth Bader Ginsburg', 'Public remarks', 1, 1761600000000);

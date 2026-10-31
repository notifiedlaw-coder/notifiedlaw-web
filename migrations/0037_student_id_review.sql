DROP INDEX `student_university_student_id`;--> statement-breakpoint
CREATE INDEX `student_university_student_id` ON `student` (`university`,`student_id`);
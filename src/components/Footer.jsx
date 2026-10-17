import React from 'react';
import {
  GraduationCap,
  Heart,
  Globe,
  BookOpen,
  ShieldCheck,
  Sparkles,
} from 'lucide-react';

export default function Footer({ onSelectCategory, onGoToUpload }) {
  return (
    <footer className="bg-white/80 dark:bg-gray-950/80 backdrop-blur-md text-slate-600 dark:text-gray-300 pt-16 pb-12 border-t border-slate-200/80 dark:border-gray-850 transition-colors duration-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-10 pb-12 border-b border-slate-200/80 dark:border-gray-850">
          
          {/* Brand & Vision */}
          <div className="space-y-4 md:col-span-1">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-linear-to-tr from-indigo-500 to-violet-500 flex items-center justify-center text-white shadow-md shadow-indigo-500/20">
                <GraduationCap className="w-5 h-5" />
              </div>
              <span className="text-xl font-bold tracking-tight text-gray-900 dark:text-white">
                NoteShare
              </span>
            </div>
            <p className="text-xs text-slate-600 dark:text-gray-400 leading-relaxed">
              An open, peer-powered global academic notes sharing initiative helping university students study smarter through high-quality shared knowledge.
            </p>
            <div className="flex items-center gap-2 text-xs text-indigo-600 dark:text-indigo-400 font-medium">
              <Globe className="w-4 h-4" />
              <span>Available in 140+ countries</span>
            </div>
          </div>

          {/* Core Categories */}
          <div>
            <h4 className="text-xs font-bold text-gray-900 dark:text-white uppercase tracking-wider mb-3">
              Explore Disciplines
            </h4>
            <ul className="space-y-2 text-xs text-slate-600 dark:text-gray-400">
              <li>
                <button
                  onClick={() => onSelectCategory('Computer Science')}
                  className="hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors cursor-pointer"
                >
                  Computer Science & AI
                </button>
              </li>
              <li>
                <button
                  onClick={() => onSelectCategory('Mathematics')}
                  className="hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors cursor-pointer"
                >
                  Pure & Applied Mathematics
                </button>
              </li>
              <li>
                <button
                  onClick={() => onSelectCategory('Physics')}
                  className="hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors cursor-pointer"
                >
                  Physics & Quantum Mechanics
                </button>
              </li>
              <li>
                <button
                  onClick={() => onSelectCategory('Engineering')}
                  className="hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors cursor-pointer"
                >
                  Engineering & Circuits
                </button>
              </li>
              <li>
                <button
                  onClick={() => onSelectCategory('Medicine & Biology')}
                  className="hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors cursor-pointer"
                >
                  Medicine, Biology & Anatomy
                </button>
              </li>
            </ul>
          </div>

          {/* Student Hub & Actions */}
          <div>
            <h4 className="text-xs font-bold text-gray-900 dark:text-white uppercase tracking-wider mb-3">
              Student Hub
            </h4>
            <ul className="space-y-2 text-xs text-slate-600 dark:text-gray-400">
              <li>
                <button
                  onClick={onGoToUpload}
                  className="hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors cursor-pointer flex items-center gap-1.5"
                >
                  <Sparkles className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                  <span>Upload Your Notes</span>
                </button>
              </li>
              <li>
                <span className="hover:text-indigo-600 dark:hover:text-indigo-400 cursor-pointer">
                  University Ambassador Program
                </span>
              </li>
              <li>
                <span className="hover:text-indigo-600 dark:hover:text-indigo-400 cursor-pointer">
                  Exam Season Study Guides
                </span>
              </li>
              <li>
                <span className="hover:text-indigo-600 dark:hover:text-indigo-400 cursor-pointer">
                  Course Code Syllabus Directory
                </span>
              </li>
            </ul>
          </div>

          {/* Academic Integrity Pledge */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold text-gray-900 dark:text-white uppercase tracking-wider flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-emerald-500 dark:text-emerald-400" />
              Academic Honor Code
            </h4>
            <p className="text-xs text-slate-600 dark:text-gray-400 leading-relaxed">
              NoteShare upholds the highest standards of academic integrity. We encourage original student summaries, lecture notes, and formula sheets that supplement learning.
            </p>
            <div className="p-3 bg-slate-50/80 dark:bg-gray-900/80 backdrop-blur-xs rounded-xl border border-slate-200/80 dark:border-gray-800 text-[11px] text-slate-700 dark:text-gray-300">
              Free and open educational resource. Created by students, for students worldwide.
            </div>
          </div>

        </div>

        {/* Bottom Bar */}
        <div className="pt-8 flex flex-col sm:flex-row items-center justify-between text-xs text-slate-500 dark:text-gray-400 gap-4">
          <p>© {new Date().getFullYear()} NoteShare Global. All rights reserved.</p>
          <div className="flex items-center gap-1">
            <span>Built with passion for students around the world</span>
            <Heart className="w-3.5 h-3.5 text-rose-500 fill-rose-500 inline mx-1" />
          </div>
        </div>

      </div>
    </footer>
  );
}

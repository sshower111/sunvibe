"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { Menu, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { CartSheet } from "@/components/cart-sheet"

export function Navigation() {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const [isAtTop, setIsAtTop] = useState(true)
  const pathname = usePathname()

  // Only use transparent nav on homepage
  const isHomePage = pathname === "/"
  const isMenuPage = pathname === "/menu"

  useEffect(() => {
    const handleScroll = () => {
      // Only transparent when at the very top
      setIsAtTop(window.scrollY < 50)
    }

    window.addEventListener("scroll", handleScroll)
    return () => window.removeEventListener("scroll", handleScroll)
  }, [])

  return (
    <nav
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-500 ${
        isHomePage && isAtTop ? "bg-transparent" : "bg-white/98 backdrop-blur-xl shadow-sm border-b border-border/30"
      }`}
    >
      <div className="container mx-auto px-8 lg:px-16 max-w-[1400px]">
        <div className="flex items-center justify-between h-28">
          {/* Logo */}
          <a href="/" className="flex items-center group">
            <img
              src={isHomePage && isAtTop ? "/logoWhite.png" : "/logoBlack.png"}
              alt="Sunville Bakery"
              className="h-14 w-auto transition-all duration-500 group-hover:scale-105"
            />
          </a>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center gap-12">
            <a
              href="/"
              className={`transition-all duration-300 font-medium text-[13px] tracking-[0.08em] uppercase hover:text-accent relative after:absolute after:bottom-[-4px] after:left-0 after:right-0 after:h-[2px] after:bg-accent after:scale-x-0 hover:after:scale-x-100 after:transition-transform after:duration-300 ${
                isHomePage && isAtTop ? "text-white after:bg-white" : "text-foreground"
              }`}
            >
              Home
            </a>
            <a
              href="/#about"
              className={`transition-all duration-300 font-medium text-[13px] tracking-[0.08em] uppercase hover:text-accent relative after:absolute after:bottom-[-4px] after:left-0 after:right-0 after:h-[2px] after:bg-accent after:scale-x-0 hover:after:scale-x-100 after:transition-transform after:duration-300 ${
                isHomePage && isAtTop ? "text-white after:bg-white" : "text-foreground"
              }`}
            >
              About
            </a>
            <a
              href="/menu"
              className={`transition-all duration-300 font-medium text-[13px] tracking-[0.08em] uppercase hover:text-accent relative after:absolute after:bottom-[-4px] after:left-0 after:right-0 after:h-[2px] after:bg-accent after:scale-x-0 hover:after:scale-x-100 after:transition-transform after:duration-300 ${
                isHomePage && isAtTop ? "text-white after:bg-white" : "text-foreground"
              }`}
            >
              Menu
            </a>
            <a
              href="/gallery"
              className={`transition-all duration-300 font-medium text-[13px] tracking-[0.08em] uppercase hover:text-accent relative after:absolute after:bottom-[-4px] after:left-0 after:right-0 after:h-[2px] after:bg-accent after:scale-x-0 hover:after:scale-x-100 after:transition-transform after:duration-300 ${
                isHomePage && isAtTop ? "text-white after:bg-white" : "text-foreground"
              }`}
            >
              Gallery
            </a>
            <a
              href="/contact"
              className={`transition-all duration-300 font-medium text-[13px] tracking-[0.08em] uppercase hover:text-accent relative after:absolute after:bottom-[-4px] after:left-0 after:right-0 after:h-[2px] after:bg-accent after:scale-x-0 hover:after:scale-x-100 after:transition-transform after:duration-300 ${
                isHomePage && isAtTop ? "text-white after:bg-white" : "text-foreground"
              }`}
            >
              Contact
            </a>
            <div className={`ml-4 ${isHomePage && isAtTop ? "text-white" : "text-foreground"}`}>
              <CartSheet />
            </div>
          </div>

          {/* Mobile Menu Button & Cart */}
          <div className="md:hidden flex items-center gap-3">
            <div className={isHomePage && isAtTop ? "text-white" : "text-foreground"}>
              <CartSheet />
            </div>
            <button
              className={`p-2.5 rounded-lg transition-all duration-300 ${
                isMobileMenuOpen
                  ? "bg-accent text-white"
                  : isHomePage && isAtTop
                    ? "text-white hover:bg-white/10"
                    : "text-foreground hover:bg-muted"
              }`}
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              aria-label="Toggle menu"
            >
              {isMobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
            </button>
          </div>
        </div>

        {/* Mobile Menu */}
        {isMobileMenuOpen && (
          <div className="md:hidden py-8 border-t border-border/30 bg-white/98 backdrop-blur-xl">
            <div className="flex flex-col gap-1">
              <a
                href="/"
                className="text-center text-foreground hover:bg-accent/5 hover:text-accent transition-all font-medium text-base tracking-wide uppercase py-4 px-6 rounded-lg"
                onClick={() => setIsMobileMenuOpen(false)}
              >
                Home
              </a>
              <a
                href="/#about"
                className="text-center text-foreground hover:bg-accent/5 hover:text-accent transition-all font-medium text-base tracking-wide uppercase py-4 px-6 rounded-lg"
                onClick={() => setIsMobileMenuOpen(false)}
              >
                About
              </a>
              <a
                href="/menu"
                className="text-center text-foreground hover:bg-accent/5 hover:text-accent transition-all font-medium text-base tracking-wide uppercase py-4 px-6 rounded-lg"
                onClick={() => setIsMobileMenuOpen(false)}
              >
                Menu
              </a>
              <a
                href="/gallery"
                className="text-center text-foreground hover:bg-accent/5 hover:text-accent transition-all font-medium text-base tracking-wide uppercase py-4 px-6 rounded-lg"
                onClick={() => setIsMobileMenuOpen(false)}
              >
                Gallery
              </a>
              <a
                href="/contact"
                className="text-center text-foreground hover:bg-accent/5 hover:text-accent transition-all font-medium text-base tracking-wide uppercase py-4 px-6 rounded-lg"
                onClick={() => setIsMobileMenuOpen(false)}
              >
                Contact
              </a>
            </div>
          </div>
        )}
      </div>
    </nav>
  )
}
